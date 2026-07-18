import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflight, createCorsResponse } from '../_shared/cors.ts';

interface ExchangeRateResponse {
  success: boolean;
  rate?: number;
  source?: string;
  timestamp?: string;
  error?: string;
}

async function fetchFromAwesomeAPI(): Promise<number | null> {
  try {
    const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    if (!response.ok) return null;
    
    const data = await response.json();
    const rate = parseFloat(data.USDBRL?.bid);
    return isNaN(rate) ? null : rate;
  } catch (error) {
    console.error('AwesomeAPI error:', error);
    return null;
  }
}

async function fetchFromBCB(): Promise<number | null> {
  try {
    // BCB API - last available rate
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const response = await fetch(
      `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${today.getMonth() + 1}-${today.getDate()}-${today.getFullYear()}'&$format=json`
    );
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.value && data.value.length > 0) {
      return parseFloat(data.value[0].cotacaoVenda);
    }
    return null;
  } catch (error) {
    console.error('BCB API error:', error);
    return null;
  }
}

export async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    console.log('Fetching USD/BRL exchange rate...');
    
    // Try AwesomeAPI first (faster and more reliable)
    let rate = await fetchFromAwesomeAPI();
    let source = 'AwesomeAPI';
    
    // Fallback to BCB if AwesomeAPI fails
    if (!rate) {
      console.log('AwesomeAPI failed, trying BCB...');
      rate = await fetchFromBCB();
      source = 'BCB';
    }
    
    // If both fail, use a default rate
    if (!rate) {
      console.log('Both APIs failed, using fallback rate');
      rate = 5.50;
      source = 'fallback';
    }

    const response: ExchangeRateResponse = {
      success: true,
      rate,
      source,
      timestamp: new Date().toISOString(),
    };

    console.log('Exchange rate fetched:', response);

    return createCorsResponse(response, req);
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    
    const response: ExchangeRateResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      rate: 5.50, // Fallback rate
      source: 'fallback',
    };

    // Return 200 with fallback to avoid breaking the UI
    return createCorsResponse(response, req);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
