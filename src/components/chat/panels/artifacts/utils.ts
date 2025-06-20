export const iframeContent = (processedCode: string) => {
  return `
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<script src="https://cdn.tailwindcss.com"></script>
		<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
		<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
		<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
		<style>
			body { 
				margin: 0; 
				padding: 0;
				font-family: Inter, system-ui, -apple-system, sans-serif; 
				-webkit-font-smoothing: antialiased;
				-moz-osx-font-smoothing: grayscale;
				background: white;
			}
			#root {
				width: 100vw;
				height: 100vh;
				max-width: 100vw;
				max-height: 100vh;
				overflow: hidden;
			}
		</style>
	</head>
	<body>
		<div id="root">Loading...</div>
		<script type="text/babel">
			console.log('Starting React component render...');
			
			try {
				// Check if React is loaded
				if (typeof React === 'undefined') {
					throw new Error('React is not loaded');
				}
				if (typeof ReactDOM === 'undefined') {
					throw new Error('ReactDOM is not loaded');
				}
				
				const { useState, useEffect, useReducer, useCallback, useMemo, useRef, Fragment } = React;
				
				// Component code injection
				${processedCode}
				
				// Check if App component is defined
				if (typeof App === 'undefined') {
					throw new Error('App component is not defined. Make sure your component exports a function named "App".');
				}
				
				console.log('Rendering App component...');
				const root = ReactDOM.createRoot(document.getElementById('root'));
				root.render(React.createElement(App));
				
			} catch (e) {
				console.error('React render error:', e);
				const root = ReactDOM.createRoot(document.getElementById('root'));
				root.render(
					React.createElement('div', {
						style: { 
							color: '#dc2626', 
							width: '100vw',
							height: '100vh',
							padding: '10px', 
							backgroundColor: '#fef2f2', 
							border: '1px solid #fecaca', 
							borderRadius: '0px',
							fontFamily: 'monospace',
							fontSize: '14px'
						}
					}, [
						React.createElement('h4', { key: 'title' }, 'React Component Error:'),
						React.createElement('pre', { 
							key: 'error',
							style: { 
								whiteSpace: 'pre-wrap', 
								wordBreak: 'break-word',
								marginTop: '10px',
								fontSize: '12px'
							}
						}, e.message || String(e))
					])
				);
			}
		</script>
	</body>
</html>
`;
};
