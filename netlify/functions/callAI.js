// นี่คือโค้ดของ "พนักงานหลังร้าน" ที่จะทำงานบนเซิร์ฟเวอร์ของ Netlify
// หน้าที่ของเขาคือรับคำสั่งจากหน้าร้าน แล้วไปคุยกับ Google อย่างปลอดภัย

exports.handler = async function (event) {
  // อนุญาตให้เรียกใช้จากหน้าเว็บของเราเท่านั้น (เพื่อความปลอดภัย)
  const headers = {
    'Access-Control-Allow-Origin': '*', // หรือใส่ URL ของ Netlify ของคุณ
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST'
  };

  // จัดการ preflight request สำหรับ CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // ตรวจสอบว่ามีคำสั่งส่งมาแบบ POST หรือไม่
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { type, prompt } = JSON.parse(event.body);
    let apiKey;
    let apiUrl;
    let requestBody;

    // แยกการทำงานระหว่าง Gemini และ Imagen
    if (type === 'gemini') {
      apiKey = process.env.GEMINI_API_KEY; // ดึงคีย์จากตู้เซฟของ Netlify
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set in Netlify environment variables.");

      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
      requestBody = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });

    } else if (type === 'imagen') {
      apiKey = process.env.IMAGEN_API_KEY; // ดึงคีย์จากตู้เซฟของ Netlify
      if (!apiKey) throw new Error("IMAGEN_API_KEY is not set in Netlify environment variables.");

      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
      requestBody = JSON.stringify({ instances: [{ prompt: prompt }], parameters: { "sampleCount": 1 } });

    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid AI type specified' }) };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API Error:', data);
      throw new Error(data.error?.message || 'API request failed');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Serverless Function Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
