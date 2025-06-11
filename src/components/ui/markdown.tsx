import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkBreaks from 'remark-breaks';
import mermaid from 'mermaid';
import { Button } from './button';
import { Maximize2, Minimize2, Download, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  suppressErrorRendering: true,
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
  },
  sequence: {
    useMaxWidth: false,
  },
  gantt: {
    useMaxWidth: false,
  },
  journey: {
    useMaxWidth: false,
  },
  gitGraph: {
    useMaxWidth: false,
  },
});

const MermaidChart: React.FC<{
  chart: string;
  id: string;
}> = ({ chart, id }) => {
  const [svg, setSvg] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [isMaximized, setIsMaximized] = React.useState<boolean>(true);
  const [isErrorExpanded, setIsErrorExpanded] = React.useState<boolean>(false);

  React.useEffect(() => {
    const renderChart = async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(`mermaid-${id}`, chart);
        setSvg(renderedSvg);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render chart');
        setSvg('');
      }
    };

    renderChart();
  }, [chart, id]);

  const handleDownload = () => {
    if (!svg) return;
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mermaid-diagram-${id}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewTab = () => {
    if (!svg) return;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mermaid Diagram</title>
        </head>
        <body>
          <div class="diagram-container">
            ${svg}
          </div>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const toggleSize = () => {
    setIsMaximized(!isMaximized);
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Error rendering mermaid chart
            <Button
              onClick={() => setIsErrorExpanded(!isErrorExpanded)}
              size="sm"
              variant="ghost"
              title={isErrorExpanded ? "Collapse details" : "Expand details"}
            >
              {isErrorExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CardTitle>
          <CardDescription>
            <p className="text-red-600 dark:text-red-400 text-sm">Error: {error}</p>
          </CardDescription>
        </CardHeader>
        {isErrorExpanded && (
          <CardContent>
            <div className="mt-2">
              <p className="text-sm font-medium mb-2">Chart definition:</p>
              <pre className="text-xs text-red-500 dark:text-red-300 overflow-auto bg-muted p-2 rounded">{chart}</pre>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <div className="w-full relative group/mermaid">
      {/* Control buttons */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover/mermaid:opacity-100 transition-opacity duration-200">
        <Button
          onClick={toggleSize}
          size="sm"
          variant="secondary"
          title={isMaximized ? "Fit to width" : "Fit to height"}
        >
          {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <Button
          onClick={handleDownload}
          size="sm"
          variant="secondary"
          title="Download SVG"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          onClick={handleOpenInNewTab}
          size="sm"
          variant="secondary"
          title="Open in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Diagram container */}
      <div 
        className={`mermaid-chart ${isMaximized ? 'mermaid-height-mode overflow-x-auto' : 'mermaid-width-mode'}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
};

export const Markdown: React.FC<{
  content: string;
  className?: string;
}> = ({ content, className = '' }) => {
  const mermaidChartId = React.useRef(0);

  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (inline) {
              return (
                <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            }

            if (language === 'mermaid') {
              const chartId = `chart-${++mermaidChartId.current}`;
              return (
                <MermaidChart
                  chart={String(children).replace(/\n$/, '')}
                  id={chartId}
                />
              );
            }
            
            return (
                <code className={className} {...props}>
                  {children}
                </code>
            );
          },
          pre({ children, ...props }: any) {
            if (React.isValidElement(children) && children.type === MermaidChart) {
              return <>{children}</>;
            }
            return (
              <pre className="bg-muted p-4 rounded-md overflow-auto" {...props}>
                {children}
              </pre>
            );
          },
          blockquote({ children, ...props }) {
            return (
              <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground" {...props}>
                {children}
              </blockquote>
            );
          },
          table({ children, ...props }) {
            return (
              <div className="overflow-auto">
                <table className="border-collapse border border-border w-full" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          th({ children, ...props }) {
            return (
              <th className="border border-border px-4 py-2 bg-muted font-semibold text-left" {...props}>
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td className="border border-border px-4 py-2" {...props}>
                {children}
              </td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};