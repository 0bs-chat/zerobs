import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import { MermaidChart } from './mermaid';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {atomDark} from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useState } from 'react';
import { Button } from '../button';
import { CopyIcon, TextIcon, WrapTextIcon, CheckIcon } from 'lucide-react';

export const Markdown: React.FC<{
  content: string;
  className?: string;
}> = ({ content, className = '' }) => {
  const mermaidChartId = React.useRef(0);

  return (
    <div className={`prose prose-default font-normal max-w-none dark:prose-invert ${className}`} style={{
      fontFamily: 'Rubik, sans-serif',
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const isCodeBlock = String(children).split('\n').length > 1;
            const language = match ? match[1] : isCodeBlock ? 'text' : null;
            const [wrapLongLines, setWrapLongLines] = useState(true);
            const [copied, setCopied] = useState(false);

            const handleCopy = async () => {
              try {
                await navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch (err) {
                console.error('Failed to copy code:', err);
              }
            };

            return !inline ? language === 'mermaid' ? (
              <MermaidChart
                chart={String(children).replace(/\n$/, '')}
                id={`chart-${++mermaidChartId.current}`}
              />
            ) : language ? (
                <div className='flex flex-col bg-card rounded-md overflow-auto'>
                  <div className='flex items-center justify-between rounded-t bg-secondary px-2 py-1 text-sm text-secondary-foreground'>
                    <span className='text-sm text-muted-foreground'>{language}</span>
                    <div className='flex items-center gap-2'>
                      <Button variant='ghost' size='icon' onClick={() => setWrapLongLines(!wrapLongLines)}>
                        {wrapLongLines ? <TextIcon className='w-4 h-4' /> : <WrapTextIcon className='w-4 h-4' />}
                      </Button>
                      <Button variant='ghost' size='icon' onClick={handleCopy} className={copied ? 'text-green-500' : ''}>
                        {copied ? <CheckIcon className='w-4 h-4' /> : <CopyIcon className='w-4 h-4' />}
                      </Button>
                    </div>
                  </div>
                  <SyntaxHighlighter
                    {...props}
                    PreTag="div"
                    customStyle={{
                      backgroundColor: 'transparent',
                      padding: '0.5rem',
                      margin: '0',
                      wrapLongLines: wrapLongLines,
                    }}
                    children={String(children).replace(/\n$/, '')}
                    language={language}
                    style={atomDark}
                  />
              </div>
            ) : (
              <code className="bg-muted px-1 py-0.5 rounded-md text-sm" {...props}>
                {children}
              </code>
            ) : <code className={className} {...props} />;
          },
          pre({ children, ...props }: any) {
            if (React.isValidElement(children) && children.type === MermaidChart) {
              return <>{children}</>;
            }
            return (
              <pre className="bg-card p-0 rounded-md overflow-auto" {...props}>
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