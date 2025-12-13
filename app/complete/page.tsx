"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CompletePage() {
  const [fontLoaded, setFontLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const font = new FontFace(
      "Trattatello",
      "url(/font/Trattatello.woff) format('woff')"
    );

    font.load().then((loadedFont) => {
      document.fonts.add(loadedFont);
      setFontLoaded(true);
    });
  }, []);

  return (
    <div className="flex text-[#424242] min-h-screen items-center justify-center bg-[#CFD1C3] overflow-hidden">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 py-16 px-8 text-center">
        {/* Christmas Tree */}
        <div className="text-[20vw] select-none animate-bounce">🎄</div>

        {/* Title */}
        <h1
          className="text-[clamp(3rem,5vw,4rem)] leading-tight text-[#424242]"
          style={{ fontFamily: fontLoaded ? "Trattatello, serif" : "serif" }}
        >
          A gift is waiting under the tree!
        </h1>

        {/* Message */}
        <p className="text-lg lg:text-2xl leading-relaxed font-[family-name:var(--font-eb-garamond)] max-w-2xl">
          Your memory is becoming a Mornament. Fold the paper, create yours, and
          hang it on the tree to share your story with others.
        </p>

        {/* Ornament Animation */}
        <div className="text-[15vw] select-none animate-pulse">🎁</div>

        {/* Buttons */}
        <div className="flex flex-col gap-4 mt-8 flex-wrap justify-center">
          <a
            href="https://my-3d-zoo.vercel.app"
            style={{ fontFamily: fontLoaded ? "Trattatello, serif" : "serif" }}
            className="p-8 text-3xl bg-[#424242] text-white rounded-[100%] hover:text-white transition-all"
          >
            See others’ memories
          </a>
          <button
            onClick={() => router.push("/")}
            className="p-8 text-3xl text-[#424242] rounded-[100%] transition-all text-lg lg:text-2xl leading-relaxed font-[family-name:var(--font-eb-garamond)]"
          >
            Create New Mornament
          </button>
        </div>

        {/* Footer */}
        <p className="text-sm text-zinc-500 dark:text-zinc-500 text-center font-[family-name:var(--font-eb-garamond)]">
          The Way We Reminisce ✨ From{" "}
          <a
            href="/team"
            className="mx-2 leading-loose border-b-2 border-dotted hover:text-[#424242] transition-colors"
          >
            생성하는 루돌프
          </a>
        </p>
      </main>
    </div>
  );
}