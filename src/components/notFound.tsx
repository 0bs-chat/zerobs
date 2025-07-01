import { Link } from "@tanstack/react-router";

export const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg">Page not found</p>
      <Link to="/">Go home</Link>
    </div>
  );
};
