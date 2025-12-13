import Link from "next/link";

export default function TeamPage() {
  const teamMembers = [
    { name: "N5 루돌프", role: "Euna", image: "/img/n5.png" },
    { name: "스테레오 루돌프", role: "Hyerim", image: "/img/st.png" },
    { name: "리듬타는 루돌프", role: "Sunjae", image: "/img/ry.png" },
    { name: "인간중심 루돌프", role: "Donghee", image: "/img/hc.png" },
  ];

  // 각 카드에 랜덤 rotation 생성 (-5도 ~ 5도)
  const rotations = teamMembers.map(() => Math.random() * 10 - 5);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-[#CFD1C3] text-[#424242]">
      <main className="flex min-h-screen w-full max-w-4xl 2xl:max-w-full flex-col items-center gap-12 py-16 px-8">
        <Link href="/" className="fixed top-0 left-0 p-8 mb-4 z-10">
          <svg
            width="25"
            height="45"
            viewBox="0 0 25 45"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M23.3051 1.06086L2.12132 22.2446L23.3051 43.4284"
              stroke="black"
              strokeWidth="1"
            />
          </svg>
        </Link>

        <h1 className="text-5xl font-bold text-center mb-8">생성하는 루돌프</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-8 w-full">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="bg-white text-center p-6 transition-transform hover:rotate-0"
              style={{ transform: `rotate(${rotations[index]}deg)` }}
            >
              <img
                src={member.image}
                alt={member.name}
                className="w-full mx-auto mb-4 object-cover"
              />
              <h2 className="text-2xl font-bold mb-2">{member.name}</h2>
              <p className="text-lg">{member.role}</p>
            </div>
          ))}
        </div>
      </main>
      {/* Footer */}
      <p className="p-8 text-sm text-zinc-500 dark:text-zinc-500 text-center font-[family-name:var(--font-eb-garamond)]">
        The Way We Reminisce ✨ From{" "}
        <a
          href="/team"
          className="mx-2 leading-loose border-b-2 border-dotted hover:text-[#424242] transition-colors"
        >
          생성하는 루돌프
        </a>
      </p>
    </div>
  );
}
