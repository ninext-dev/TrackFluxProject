import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { webhookId, status, resultFileName, error } = await req.json()

    console.log('Received webhook:', { webhookId, status, resultFileName, error })

    if (status === 'success' && resultFileName) {
      // The n8n workflow should have already uploaded the result file to the pcp-results bucket
      // We just need to acknowledge receipt
      console.log(`Planning result ready: ${resultFileName}`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook received successfully',
          webhookId,
          resultFileName 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else if (status === 'error') {
      console.error('Planning failed:', error)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Planning failed',
          error 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Invalid webhook payload' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )

  } catch (error) {
    console.error('Webhook error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})