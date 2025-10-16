import Image from "next/image";
import tasklogo from "./../assets/images/tasklogo.png";
import Link from "next/link";


export default function Home() {
  return (
    <div className="pt-20">
      <div className="flex flex-col items-center">
        <Image src={tasklogo} alt="tasklogo" width={150} height={150} />
        <h1 className="text-2xl font-bold mt-7 mb-7">
          Manage Task App
        </h1>
        <Link href="/alltask" className="text-white hover:bg-violet-600 block  w-sm px-4 py-2 rounded border bg-violet-400 text-center">
        เข้าใช้งาน
        </Link>
      </div>

    </div>
  );
}
