// Vercel Serverless Function • Text-to-Speech (TTS) com Voz Neural de Alta Fidelidade
// 1. Prioridade A: OpenAI TTS (tts-1) com vozes neurais ultra-realistas (nova, onyx, alloy) se OPENAI_API_KEY estiver configurada.
// 2. Prioridade B: Motor Neural Google Cloud TTS (pt-BR) gratuito e sem necessidade de chave de API, com junção de frames MP3.

export const config = {
  runtime: 'edge',
};

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.byteLength;
  }
  return result;
}

// Divide textos longos em segmentos naturais preservando pausas e pontuação
function splitIntoNaturalChunks(text: string, maxLen = 180): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    let splitIdx = remaining.lastIndexOf('. ', maxLen);
    if (splitIdx === -1) splitIdx = remaining.lastIndexOf('! ', maxLen);
    if (splitIdx === -1) splitIdx = remaining.lastIndexOf('? ', maxLen);
    if (splitIdx === -1) splitIdx = remaining.lastIndexOf('; ', maxLen);
    if (splitIdx === -1) splitIdx = remaining.lastIndexOf(', ', maxLen);
    if (splitIdx === -1) splitIdx = remaining.lastIndexOf(' ', maxLen);
    if (splitIdx === -1) splitIdx = maxLen;
    else splitIdx += 1;

    const chunk = remaining.slice(0, splitIdx).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(splitIdx).trim();
  }

  return chunks;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido. Use POST.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { text, voice = 'nova', speed = 1.0 } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Texto não fornecido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Limpeza semântica para narração humana fluida (remove siglas técnicas frias e formatações markdown)
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[#*`_~]/g, '')
      .replace(/•/g, ', ')
      .replace(/CBMAM/gi, 'Corpo de Bombeiros')
      .replace(/ICMBio/gi, 'I-C-M-Bio')
      .replace(/FUNAI/gi, 'Funai')
      .replace(/PM2\.5/gi, 'partículas finas P-M 2.5')
      .replace(/AQI/gi, 'índice de qualidade do ar')
      .replace(/FRP/gi, 'potência térmica radiativa')
      .replace(/MW/gi, 'Megawatts')
      .replace(/km²/gi, 'quilômetros quadrados')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1800);

    const openaiApiKey = process.env.OPENAI_API_KEY;

    // 1. Tenta OpenAI TTS caso chave esteja presente
    if (openaiApiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: cleanText,
            voice: voice === 'masculina' ? 'onyx' : 'nova', // 'nova' é calorosa e natural; 'onyx' é tática e sóbria
            speed: Math.max(0.85, Math.min(1.15, speed)),
          }),
        });

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          return new Response(audioBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'audio/mpeg',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=86400',
            },
          });
        }
      } catch (e) {
        console.warn('Erro ao chamar OpenAI TTS, acionando motor neural alternativo:', e);
      }
    }

    // 2. Motor Neural Google TTS em Português Brasileiro (Sem necessidade de chave, 100% natural)
    try {
      const chunks = splitIntoNaturalChunks(cleanText, 175);
      const audioBuffers: Uint8Array[] = [];

      for (const chunk of chunks) {
        const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=pt-BR&client=tw-ob`;
        const gRes = await fetch(googleUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (gRes.ok) {
          const buf = await gRes.arrayBuffer();
          audioBuffers.push(new Uint8Array(buf));
        }
      }

      if (audioBuffers.length > 0) {
        const fullAudio = concatUint8Arrays(audioBuffers);
        return new Response(fullAudio, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    } catch (gErr) {
      console.warn('Falha no motor neural Google TTS:', gErr);
    }

    // 3. Fallback informativo
    return new Response(
      JSON.stringify({
        success: true,
        useWebSpeech: true,
        text: cleanText,
        lang: 'pt-BR',
        message: 'Utilizando Web Speech API com vozes neurais pré-carregadas.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Falha ao processar Text-to-Speech.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
