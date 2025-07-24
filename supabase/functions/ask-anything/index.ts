import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const huggingFaceApiKey = Deno.env.get('HUGGING_FACE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!huggingFaceApiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const { question, sessionId } = await req.json();
    
    if (!question) {
      throw new Error('Question is required');
    }

    console.log('Processing question:', question);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Search for relevant knowledge from our sources
    const { data: sources, error: sourcesError } = await supabase
      .from('knowledge_sources')
      .select('*')
      .textSearch('content', question, { type: 'websearch' });

    if (sourcesError) {
      console.error('Error searching knowledge sources:', sourcesError);
    }

    // Create context from relevant sources
    const context = sources?.map(source => 
      `Source: ${source.title} (${source.url})\nContent: ${source.content}`
    ).join('\n\n') || '';

    // Call Hugging Face with context
    const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${huggingFaceApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `Context: ${context}\n\nYou are a knowledgeable assistant for Re:cinq, a company specializing in AI Native and Cloud Native technologies. 

About Re:cinq:
- They help businesses integrate AI and Cloud Native technologies
- They offer three main services: Build Foundation, Accelerate Software Delivery, and Drive Strategic Growth
- They have a community called "Waves of Innovation" with newsletter, podcast, and resources
- They focus on the transition from Cloud Native to AI Native

Use the context provided to answer questions about Re:cinq accurately. If you don't know something based on the context, say so clearly.

Question: ${question}
Answer:`,
        parameters: {
          max_length: 1000,
          temperature: 0.7,
          return_full_text: false
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const data = await response.json();
    const answer = Array.isArray(data) ? data[0]?.generated_text || 'No response generated' : data.generated_text || 'No response generated';

    // Store the conversation
    const sourceIds = sources?.map(s => s.id) || [];
    const { error: insertError } = await supabase
      .from('conversations')
      .insert({
        question,
        answer,
        sources_used: sourceIds,
        session_id: sessionId || null,
      });

    if (insertError) {
      console.error('Error storing conversation:', insertError);
    }

    console.log('Generated answer for question:', question);

    return new Response(JSON.stringify({ 
      answer,
      sources: sources || [],
      sessionId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ask-anything function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});