import React from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// The light build ships no languages; register only the one the debug window needs
SyntaxHighlighter.registerLanguage('json', json);

interface JsonViewerProps {
  data: unknown; // JSON data to display
}

/**
 * Pretty-printed, syntax-highlighted JSON for the debug window. Import it lazily
 * (see DebugWindow) so the highlighter stays out of the main bundle.
 */
export const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  return (
    <SyntaxHighlighter language="json" style={vscDarkPlus}>
      {JSON.stringify(data, null, 2)}
    </SyntaxHighlighter>
  );
};

export default JsonViewer;
