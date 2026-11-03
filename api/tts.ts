// Vercel Serverless Function • Text-to-Speech (TTS)
// Suporta OpenAI TTS (tts-1) com fallback para retorno instruindo Web Speech API client-side

export const config = {
  runtime: 'edge',
};

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
    const { text, voice = 'onyx', speed = 1.0 } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Texto não fornecido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Sanitiza o texto para leitura (remove marcações markdown pesadas e links)
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[#*`_~]/g, '')
      .replace(/•/g, ', ')
      .trim()
      .slice(0, 1500); // Limite de caracteres para resposta rápida

    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (openaiApiKey) {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: cleanText,
          voice: voice, // 'onyx' (grave e tático), 'alloy', ou 'nova'
          speed: Math.max(0.75, Math.min(1.25, speed)),
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
    }

    // Se chave OpenAI não configurada ou erro no upstream, instrui o client a usar Web Speech API nativa
    return new Response(
      JSON.stringify({
        success: true,
        useWebSpeech: true,
        text: cleanText,
        lang: 'pt-BR',
        message: 'OpenAI TTS não configurado; utilize a Web Speech API client-side.',
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

