// นี่คือโค้ดของ "พนักงานหลังร้าน" ที่จะทำงานบนเซิร์ฟเวอร์ของ Netlify
// หน้าที่ของเขาคือรับคำสั่งจากหน้าร้าน แล้วไปคุยกับ Google อย่างปลอดภัย

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { type, prompt } = JSON.parse(event.body);
    let apiKey;
    let apiUrl;
    let requestBody;

    // ส่วนของ Gemini ยังคงเหมือนเดิม
    if (type === 'gemini') {
      apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
      requestBody = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });

      // =======================================================
      // ========== ส่วนของ Imagen ที่เราจะแก้ไข ==========
      // =======================================================
    } else if (type === 'imagen') {
      apiKey = process.env.IMAGEN_API_KEY; // ยังใช้ Key เดิม
      if (!apiKey) throw new Error("IMAGEN_API_KEY is not set.");

      // เปลี่ยนไปใช้โมเดลที่ยังฟรีและไม่ต้องผูกบัตร
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

      // เปลี่ยนรูปแบบการส่งคำสั่งให้ตรงกับโมเดลใหม่
      requestBody = JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseModalities: ['IMAGE']
        }
      });

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

    // เพิ่มการตรวจสอบผลลัพธ์สำหรับโมเดลใหม่
    let responseData = data;
    if (type === 'imagen') {
      const base64Data = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (!base64Data) {
        throw new Error("No image data found in Gemini Image Preview response.");
      }
      // จัดรูปแบบผลลัพธ์ให้เหมือนกับที่ Imagen API เคยส่งกลับมา
      // เพื่อให้โค้ดหน้าร้านของเราไม่ต้องแก้ไขอะไรเลย
      responseData = {
        predictions: [{
          bytesBase64Encoded: base64Data
        }]
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData),
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

