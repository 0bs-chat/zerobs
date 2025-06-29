export const DefaultCatchBoundary = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">Error</h1>
      <p className="text-lg">An error occurred</p>
    </div>
  );
};
