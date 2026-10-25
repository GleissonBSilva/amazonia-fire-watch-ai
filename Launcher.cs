using System;
using System.IO;
using System.Net;
using System.Text;
using System.Reflection;
using System.Diagnostics;
using System.Threading;
using System.Windows.Forms;

namespace AmazoniaFireWatch
{
    static class Program
    {
        private static HttpListener listener;
        private static int port = 54321;
        private static bool isRunning = true;
        private static string targetFilePath = null;

        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                // 1. Ensure index.html is available locally (or extract from embedded resource)
                string localHtml = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "index.html");
                if (File.Exists(localHtml))
                {
                    targetFilePath = localHtml;
                }
                else
                {
                    string tempDir = Path.Combine(Path.GetTempPath(), "AmazoniaFireWatch");
                    if (!Directory.Exists(tempDir)) Directory.CreateDirectory(tempDir);
                    targetFilePath = Path.Combine(tempDir, "index.html");

                    using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("index.html"))
                    {
                        if (stream != null)
                        {
                            byte[] buffer = new byte[stream.Length];
                            stream.Read(buffer, 0, buffer.Length);
                            File.WriteAllBytes(targetFilePath, buffer);
                        }
                    }
                }

                // 2. Start persistent HTTP listener in background thread (as dual fallback)
                while (port < 54360)
                {
                    try
                    {
                        listener = new HttpListener();
                        listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
                        listener.Start();
                        break;
                    }
                    catch
                    {
                        port++;
                    }
                }

                if (listener != null && listener.IsListening)
                {
                    Thread serverThread = new Thread(ListenRequests);
                    serverThread.IsBackground = true;
                    serverThread.Start();
                }

                // 3. Prepare URL: Direct file URI avoids all 127.0.0.1 firewall and connection race conditions
                string fileUri = new Uri(targetFilePath).AbsoluteUri;
                string httpUrl = "http://127.0.0.1:" + port + "/";

                // 4. Locate Microsoft Edge or Google Chrome for App Mode (Dedicated window without browser bars)
                string edgePath1 = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
                string edgePath2 = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
                string chromePath1 = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
                string chromePath2 = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";

                string browserExe = null;
                if (File.Exists(edgePath1)) browserExe = edgePath1;
                else if (File.Exists(edgePath2)) browserExe = edgePath2;
                else if (File.Exists(chromePath1)) browserExe = chromePath1;
                else if (File.Exists(chromePath2)) browserExe = chromePath2;

                if (browserExe != null)
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = browserExe;
                    // Passing direct fileUri opens instantly without any 127.0.0.1 connection delay or refusal
                    psi.Arguments = "--app=\"" + fileUri + "\" --window-size=1440,920 --window-position=50,50";
                    psi.UseShellExecute = false;
                    Process.Start(psi);
                }
                else
                {
                    // Fallback to default browser
                    Process.Start(new ProcessStartInfo(fileUri) { UseShellExecute = true });
                }

                // 5. Allow browser process time to attach and launch, then exit cleanly
                // Direct fileUri means the browser runs independently without background locks
                Thread.Sleep(1500);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao inicializar AMAZÔNIA FIRE-WATCH AI: " + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                isRunning = false;
                if (listener != null && listener.IsListening)
                {
                    listener.Stop();
                }
            }
        }

        private static void ListenRequests()
        {
            while (isRunning && listener != null && listener.IsListening)
            {
                try
                {
                    HttpListenerContext context = listener.GetContext();
                    HttpListenerRequest request = context.Request;
                    HttpListenerResponse response = context.Response;

                    byte[] buffer = null;
                    if (File.Exists(targetFilePath))
                    {
                        buffer = File.ReadAllBytes(targetFilePath);
                    }
                    else
                    {
                        using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("index.html"))
                        {
                            if (stream != null)
                            {
                                buffer = new byte[stream.Length];
                                stream.Read(buffer, 0, buffer.Length);
                            }
                            else
                            {
                                buffer = Encoding.UTF8.GetBytes("<h1>AMAZÔNIA FIRE-WATCH AI - Pronto.</h1>");
                            }
                        }
                    }

                    response.ContentType = "text/html; charset=utf-8";
                    response.ContentLength64 = buffer.Length;
                    response.OutputStream.Write(buffer, 0, buffer.Length);
                    response.OutputStream.Close();
                }
                catch
                {
                    // Silent catch for client disconnect
                }
            }
        }
    }
}
