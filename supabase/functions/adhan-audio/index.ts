import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ADHAN_AUDIO_URL = "https://www.islamcan.com/audio/adhan/azan1.mp3";

serve(async (req) => {
  // Enable CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    console.log('Fetching Adhan audio from IslamCan...');
    
    // Fetch the audio file from IslamCan
    const response = await fetch(ADHAN_AUDIO_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }

    // Get the audio blob
    const audioBlob = await response.arrayBuffer();
    
    console.log(`Successfully fetched Adhan audio: ${audioBlob.byteLength} bytes`);

    // Return the audio with proper headers
    return new Response(audioBlob, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBlob.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error fetching Adhan audio:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch Adhan audio',
        details: error.message 
      }), 
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
