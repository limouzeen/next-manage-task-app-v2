"use client";

import Image from "next/image";
import tasklogo from "./../../assets/images/tasklogo.png";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

// IMPORT UTILITIES
import { db } from "./../../lib/firebaseClient"; 
import { supabase } from "./../../lib/supabaseClient";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";

// (Type Task ไม่ต้องเปลี่ยนแปลง)
type Task = {
  id: string; 
  created_at: string;
  title: string;
  detail: string;
  imageUrl: string;
  isCompleted: boolean;
  updated_at: string;
};

// (Helper function ไม่ต้องเปลี่ยนแปลง)
function extractPathFromSupabaseUrl(publicUrl: string): string | null {
  try {
    const u = new URL(publicUrl);
    const marker = "/public/";
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    return u.pathname.slice(i + marker.length);
  } catch {
    return null;
  }
}

const COLLECTION_NAME = "task_tb";
const SUPABASE_BUCKET_NAME = "task_bk";

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasksCol = collection(db, COLLECTION_NAME);
        const q = query(tasksCol, orderBy("created_at", "desc"));
        const taskSnapshot = await getDocs(q);
        
        const taskList: Task[] = taskSnapshot.docs.map((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            title: data.title as string,
            detail: data.detail as string,
            imageUrl: (data.imageUrl || data.image_url || '') as string,
            isCompleted: data.isCompleted !== undefined ? data.isCompleted : data.is_completed,
            created_at: (data.created_at && typeof data.created_at.toDate === 'function')
              ? data.created_at.toDate().toISOString()
              : (data.created_at as string),
            updated_at: (data.updatedAt && typeof data.updatedAt.toDate === 'function')
              ? data.updatedAt.toDate().toISOString()
              : (data.updated_at as string),
          };
        });
        setTasks(taskList);
      } catch (error) {
        console.error("Error fetching tasks from Firestore:", error instanceof Error ? error.message : "An unknown error occurred");
      }
    };
    
    fetchTasks();
  }, [pathname]);

  // (ส่วน handleDelete ไม่มีการเปลี่ยนแปลง)
  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบรายการนี้หรือไม่")) return;

    const task = tasks.find(t => t.id === id);
    const oldUrl = task?.imageUrl || "";
    const storagePathWithBucket = oldUrl ? extractPathFromSupabaseUrl(oldUrl) : null; 

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (dbError) {
      console.error("ลบข้อมูลใน Firestore ไม่สำเร็จ:", dbError);
      alert("ลบข้อมูลในฐานข้อมูลไม่สำเร็จ");
      return;
    }

    if (storagePathWithBucket) {
      const filePathOnly = storagePathWithBucket.replace(`${SUPABASE_BUCKET_NAME}/`, '');
      try {
        const { error: deleteError } = await supabase.storage
          .from(SUPABASE_BUCKET_NAME)
          .remove([filePathOnly]);
        if (deleteError) throw deleteError;
      } catch (deleteError) {
        console.warn("ลบไฟล์รูปใน Supabase ไม่สำเร็จ:", deleteError);
      }
    }

    setTasks(prev => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="p-20">
      <div className="flex flex-col items-center">
        <Image src={tasklogo} alt="tasklogo" width={100} height={100} priority />
        <h1 className="text-xl font-bold mt-5 mb-7">Manage Task App</h1>
      </div>
      <div className="flex flex-row-reverse">
        <Link
          href="/addtask"
          className="text-white hover:bg-violet-600 block px-4 py-2 rounded border bg-violet-400 text-center"
        >
          เพิ่มงาน
        </Link>
      </div>
      <div className="mt-5 mb-5">
        <table className="min-w-full border border-grat-700 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">รูป</th>
              <th className="border p-2">Title</th>
              <th className="border p-2">Detail</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">วันที่เพิ่ม</th>
              <th className="border p-2">วันที่แก้ไข</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="border p-2">
                  {task.imageUrl ? (
                    <Image
                      className="mx-auto w-12 h-12 object-cover rounded"
                      src={task.imageUrl}
                      alt="taskimage"
                      width={50}
                      height={50}
                      sizes="50px"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="text-gray-400 italic">ไม่มีรูป</span>
                  )}
                </td>
                <td className="border p-2">{task.title}</td>
                <td className="border p-2">{task.detail}</td>
                <td className="border p-2 text-center">
                  {task.isCompleted ? "Completed" : "Not Completed"}
                </td>
                <td className="border p-2 text-center">{task.created_at}</td>
                
                {/* 👇 **จุดที่แก้ไขอยู่ตรงนี้ครับ** 👇 */}
                <td className="border p-2 text-center">
                  {task.updated_at !== task.created_at ? task.updated_at : "-"}
                </td>

                <td className="border p-2 text-center">
                  <Link
                    href={`/edittask/${task.id}`}
                    className="text-violet-500 hover:text-violet-700 underline px-2 text-center"
                  >
                    แก้ไข
                  </Link>
                  <button onClick={() => handleDelete(task.id)} className="text-red-500 hover:text-red-700 underline cursor-pointer px-2">
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link
        href="/"
        className="text-violet-400 hover:text-violet-600 block px-4 py-2 rounded text-center mt-10"
      >
        กลับไปหน้าแรก
      </Link>
    </div>
  );
}