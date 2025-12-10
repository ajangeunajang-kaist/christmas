"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  const [letter, setLetter] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fontLoaded, setFontLoaded] = useState(false);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    // 여기에 저장 로직을 추가할 수 있습니다
    alert("당신의 이야기를 담아 모뉴먼트를 생성하고 있어요! 🎄");
  };

  return (
    <div className="flex text-[#424242] min-h-screen items-center justify-center bg-[#CFD1C3]">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center gap-8 py-16 px-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-[20vw]">🎄</div>
          <h1
            className="text-[clamp(3rem,6vw,5rem)] text-[#424242] dark:text-red-400 mb-2"
            style={{ fontFamily: fontLoaded ? "Trattatello, serif" : "serif" }}
          >
            The Way We Reminisce
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            2025년을 돌아보며 기억에 남는 순간, 혹은 새해를 맞이하며 소망을
            기록해보세요
          </p>
        </div>

        {/* Letter Writing Section */}
        <div className="w-full h-full bg-white dark:bg-zinc-900  shadow-2xl p-8">
          <textarea
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            placeholder="올해 가장 기억에 남는 순간을 적어보세요. 사랑하는 사람들과 함께한 시간, 이루었던 작은 성취들, 감사한 순간들을 떠올려보세요. 2026년을 맞아 간절히 이루고 싶은 소망을 적어봐도 좋아요."
            className="w-full h-[50vh] p-4 text-lg resize-none focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
          />

          {/* Image Upload Section */}
          <div className="mt-6">
            <label className="block mb-3 text-lg font-semibold text-zinc-700 dark:text-zinc-300">
              📷 추억의 사진 한 장
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-zinc-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 dark:file:bg-red-900 dark:file:text-red-200"
            />
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="mt-6 relative">
              <Image
                src={imagePreview}
                alt="Uploaded memory"
                width={600}
                height={400}
                className="w-full h-auto max-h-96 object-cover rounded-lg border-4 border-zinc-200 dark:border-zinc-700"
              />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!letter.trim()}
            style={{ fontFamily: fontLoaded ? "Trattatello, serif" : "serif" }}
            className="w-full mt-8 py-4 bg-[#CFD1C3] text-white text-3xl rounded-full hover:from-red-600 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            Create Your Monument
          </button>
        </div>

        {/* Footer */}
        <p className="text-sm text-zinc-500 dark:text-zinc-500 text-center">
          The Way We Reminisce ✨ From 생성하는 루돌프
        </p>
      </main>
    </div>
  );
}
