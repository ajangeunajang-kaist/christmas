"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Footer from "../components/Footer";
import GLBViewer from "../components/GLBViewer";

interface LetterData {
  id: string;
  ornamentName: string;
  story: string;
  imageUrl: string | null;
  asset3dUrl: string | null;
  meshyTaskId: string | null;
  refineTaskId?: string | null;
  [key: string]: any;
}

export default function CompletePage() {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [letterData, setLetterData] = useState<LetterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // ornamentId로 letter 데이터 불러오기 및 폴링
  useEffect(() => {
    const ornamentId = searchParams.get("ornamentId");
    if (!ornamentId) {
      setIsLoading(false);
      return;
    }

    let pollInterval: NodeJS.Timeout;

    const fetchLetterData = async () => {
      try {
        const response = await fetch(`/api/letters/${ornamentId}`);
        if (!response.ok) {
          console.error("Failed to fetch letter data");
          setIsLoading(false);
          return;
        }

        const result = await response.json();
        if (result.success) {
          setLetterData(result.data);

          // asset3dUrl이 있으면 로딩 완료
          if (result.data.asset3dUrl) {
            setProgress(100);
            setIsLoading(false);
            if (pollInterval) clearInterval(pollInterval);
            return;
          }

          // refineTaskId가 있으면 상태 폴링
          if (result.data.refineTaskId) {
            const statusResponse = await fetch(
              `/api/meshy/${result.data.refineTaskId}?ornamentId=${ornamentId}`
            );
            if (statusResponse.ok) {
              const statusResult = await statusResponse.json();
              if (statusResult.progress) {
                setProgress(statusResult.progress);
              }

              // asset3dUrl이 업데이트되었으면 다시 fetch
              if (statusResult.asset3dUrl) {
                await fetchLetterData();
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching letter data:", error);
        setIsLoading(false);
      }
    };

    // 초기 로드
    fetchLetterData();

    // asset3dUrl이 없으면 폴링 시작
    pollInterval = setInterval(() => {
      if (!letterData?.asset3dUrl) {
        fetchLetterData();
      }
    }, 3000); // 3초마다 폴링

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [searchParams, letterData?.asset3dUrl]);

  return (
    <div className="flex text-[#424242] min-h-screen items-center justify-center bg-[#CFD1C3] overflow-hidden">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 py-16 px-8 text-center">
        {/* Christmas Tree */}
        <div className="text-[40vw] sm:text-[20vw] select-none">🎄</div>

        {/* Title */}
        <h1
          className="text-[clamp(3rem,5vw,4rem)] leading-tight text-[#424242]"
          style={{ fontFamily: fontLoaded ? "Trattatello, serif" : "serif" }}
        >
          {letterData?.asset3dUrl
            ? "Your Mornament is ready!"
            : "A gift is waiting under the tree!"}
        </h1>

        {/* Message */}
        <p className="text-lg lg:text-2xl leading-relaxed font-[family-name:var(--font-eb-garamond)] max-w-2xl">
          {letterData?.asset3dUrl
            ? "Your memory has become a Mornament. Rotate and explore your creation!"
            : "Your memory is becoming a Mornament. Fold the paper, create yours, and hang it on the tree to share your story with others."}
        </p>

        {/* GLB Viewer 또는 로딩 상태 */}
        {letterData?.asset3dUrl ? (
          <div className="w-full h-[500px] max-w-2xl">
            <GLBViewer glbUrl={letterData.asset3dUrl} />
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="mt-8 text-[40vw] sm:text-[15vw] select-none animate-bounce">
              🎁
            </div>
            <div className="text-lg font-[family-name:var(--font-eb-garamond)]">
              Creating your 3D ornament... {progress}%
            </div>
          </div>
        ) : (
          <div className="mt-8 text-[40vw] sm:text-[15vw] select-none animate-bounce">
            🎁
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-4 flex-wrap justify-center">
          <a
            href="https://my-3d-zoo.vercel.app"
            style={{ fontFamily: fontLoaded ? "Trattatello, serif" : "serif" }}
            className="p-8 text-3xl bg-[#424242] text-white rounded-[100%] hover:text-white transition-all"
          >
            See others' memories
          </a>
          <button
            onClick={() => router.push("/")}
            className="pt-8 text-3xl text-[#424242] transition-all text-lg lg:text-2xl leading-relaxed font-[family-name:var(--font-eb-garamond)]"
          >
            <span className="border-b-2 border-dotted">
              {" "}
              Create New Mornament
            </span>
          </button>
        </div>

        <Footer />
      </main>
    </div>
  );
}