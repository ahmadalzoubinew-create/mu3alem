import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <h1 className="text-6xl font-black text-amber-500 mb-2">مُعلم</h1>
        <p className="text-zinc-400 text-sm mb-8">Mu3alem · Sales OS</p>
        <Link href="/login"
          className="bg-amber-500 text-black font-bold px-8 py-3 rounded-xl text-sm hover:bg-amber-400 transition">
          دخول ←
        </Link>
      </div>
    </div>
  );
}