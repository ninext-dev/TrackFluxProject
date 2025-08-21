import React from 'react';

export default function IndicatorsPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">Indicadores</h1>
        <p className="text-sm text-gray-600 mt-1">
          Dashboard de indicadores e métricas do Power BI
        </p>
      </div>
      
      <div className="flex-1 p-6">
        <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <iframe
            src="https://app.powerbi.com/reportEmbed?reportId=05528b51-ab92-4702-b0a1-6fae2009e8fa&amp;autoAuth=true&amp;ctid=e524f1b1-495d-41da-8e4c-f35459e1e52d"
            className="w-full h-screen border-0"
            title="Power BI Dashboard"
            allow="fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      </div>
    </div>
  );
}