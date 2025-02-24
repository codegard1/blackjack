import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface JsonViewerProps {
  data: any; // JSON data to display
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  return (
    <SyntaxHighlighter language="json" format={'JSON'} style={vscDarkPlus}>
      {JSON.stringify(data, null, 2)}
    </SyntaxHighlighter>
  );
};
