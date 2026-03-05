"use client";

type RouteLoadingProps = {
  label?: string;
};

function CodepenOrbitalSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <>
      <style jsx global>{`
        @keyframes dcc-orbit-rotate-one {
          0% {
            transform: rotateX(35deg) rotateY(-45deg) rotateZ(0deg);
          }
          100% {
            transform: rotateX(35deg) rotateY(-45deg) rotateZ(360deg);
          }
        }

        @keyframes dcc-orbit-rotate-two {
          0% {
            transform: rotateX(50deg) rotateY(10deg) rotateZ(0deg);
          }
          100% {
            transform: rotateX(50deg) rotateY(10deg) rotateZ(360deg);
          }
        }

        @keyframes dcc-orbit-rotate-three {
          0% {
            transform: rotateX(35deg) rotateY(55deg) rotateZ(0deg);
          }
          100% {
            transform: rotateX(35deg) rotateY(55deg) rotateZ(360deg);
          }
        }
      `}</style>

      <span
        role="progressbar"
        aria-label={label}
        className="relative inline-block h-16 w-16 rounded-full text-green-700"
        style={{ perspective: "800px" }}
      >
        <span
          className="absolute inset-0 rounded-full border-b-[3px] border-current"
          style={{ animation: "dcc-orbit-rotate-one 1s linear infinite" }}
        />
        <span
          className="absolute inset-0 rounded-full border-r-[3px] border-current"
          style={{ animation: "dcc-orbit-rotate-two 1s linear infinite" }}
        />
        <span
          className="absolute inset-0 rounded-full border-t-[3px] border-current"
          style={{ animation: "dcc-orbit-rotate-three 1s linear infinite" }}
        />
      </span>
    </>
  );
}

export function RouteLoading({ label = "Loading" }: RouteLoadingProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <CodepenOrbitalSpinner label={label} />
    </div>
  );
}
