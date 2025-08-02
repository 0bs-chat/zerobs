import { CircleStopIcon } from "lucide-react";
import { useState } from "react";

const videoSrc =
  "https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS7jPNQyfoRlTOJZLHPU4rbCz2w1X9SVIfEyKF";

export const StopButtonIcon = ({ className }: { className?: string }) => {
  const [error, setError] = useState(false);

  if (error) {
    return <CircleStopIcon className={className} />;
  }

  return (
    <video
      src={videoSrc}
      aria-label="Stop button animation"
      role="img"
      autoPlay
      loop
      muted
      playsInline
      onError={() => setError(true)}
      className={className}
    />
  );
};
