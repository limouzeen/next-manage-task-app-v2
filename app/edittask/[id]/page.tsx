"use client";

import Image from "next/image";
import tasklogo from "./../../../assets/images/tasklogo.png";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

// 1. **IMPORT UTILITIES**
import { db } from "./../../../lib/firebaseClient"; // DB from Firebase
import { supabase } from "./../../../lib/supabaseClient"; // <-- 🔥 Storage from Supabase
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { FirebaseError } from "firebase/app";

// **กำหนดชื่อ Collection และ Bucket**
const FIRESTORE_COLLECTION = "task_tb"; // Collection ใน Firestore
const SUPABASE_BUCKET = "task_bk"; // <-- 🔥 Bucket ใน Supabase

// 2. **🔥 HELPER FUNCTION สำหรับดึง Path จาก SUPABASE URL**
function extractPathFromSupabaseUrl(publicUrl: string): string | null {
  try {
    const u = new URL(publicUrl);
    const marker = `/public/${SUPABASE_BUCKET}/`;
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;

    // เราจะได้ path ของไฟล์ที่อยู่ภายใน bucket
    // เช่น "167...-image.jpg"
    return u.pathname.slice(i + marker.length);
  } catch {
    return null;
  }
}


export default function Page() {
  const params = useParams<{ id: string }>();
  const taskId = params?.id;

  const router = useRouter();

  // (ส่วน State ไม่มีการเปลี่ยนแปลง)
  const [title, setTitle] = useState<string>("");
  const [detail, setDetail] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [oldImageUrl, setOldImageUrl] = useState<string | null>(null);

  // (ส่วน useEffect ดึงข้อมูลจาก Firestore เหมือนเดิม)
  useEffect(() => {
    if (!taskId) return;
    const fetchTaskById = async () => {
      const taskDocRef = doc(db, FIRESTORE_COLLECTION, taskId);
      try {
        const docSnap = await getDoc(taskDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTitle(data.title ?? "");
          setDetail(data.detail ?? "");
          setIsCompleted(data.isCompleted ?? false);
          setPreviewImage(data.imageUrl ?? null);
          setOldImageUrl(data.imageUrl ?? null);
        } else {
          console.error("No such document!");
          alert("ไม่พบข้อมูลงานที่ต้องการแก้ไข");
          router.push("/alltask");
        }
      } catch (error) {
        console.error("Error fetching document:", error);
        alert("พบปัญหาในการโหลดข้อมูล ลองใหม่อีกครั้ง");
      }
    };
    fetchTaskById();
  }, [taskId, router]);

  // (ส่วน handleImageChange เหมือนเดิม)
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  // 3. **🔥 แก้ไข LOGIC การอัปเดตให้ใช้ SUPABASE STORAGE**
  const handleUpdateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!taskId) return;

    let newImageUrl = oldImageUrl; // เริ่มต้นด้วย URL เก่า

    try {
      // 1. ถ้ามีการเลือกไฟล์ใหม่ ให้อัปโหลดไปที่ SUPABASE
      if (imageFile) {
        const filePath = `${Date.now()}-${imageFile.name}`;
        
        // อัปโหลดไฟล์ใหม่
        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(filePath, imageFile);
        if (uploadError) throw uploadError;

        // ดึง Public URL ของไฟล์ใหม่
        const { data } = supabase.storage
          .from(SUPABASE_BUCKET)
          .getPublicUrl(filePath);
        newImageUrl = data.publicUrl;

        // 2. ถ้ามี URL รูปเก่าอยู่ ให้ลบออกจาก SUPABASE
        if (oldImageUrl) {
          const oldPath = extractPathFromSupabaseUrl(oldImageUrl);
          if (oldPath) {
            const { error: deleteError } = await supabase.storage
              .from(SUPABASE_BUCKET)
              .remove([oldPath]);
            if (deleteError) {
              console.warn("ลบรูปเก่าจาก Supabase ไม่สำเร็จ:", deleteError);
            }
          }
        }
      }

      // 3. อัปเดตข้อมูลใน FIREBASE FIRESTORE (เหมือนเดิม)
      const taskDocRef = doc(db, FIRESTORE_COLLECTION, taskId);
      await updateDoc(taskDocRef, {
        title,
        detail,
        isCompleted,
        imageUrl: newImageUrl, // ใช้ URL ใหม่ที่ได้จาก Supabase
        updatedAt: serverTimestamp(),
      });

      alert("แก้ไขงานเรียบร้อย");
      router.push("/alltask");

    } catch (error) {
      console.error("Error updating task:", error);
      alert("พบปัญหาในการทำงาน ลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ");
    }
  };

  return (
    // (ส่วน JSX ทั้งหมดไม่มีการเปลี่ยนแปลง)
    <div className="pt-20">
      <div className="flex flex-col items-center">
        <Image src={tasklogo} alt="tasklogo" width={100} height={100} />
        <h1 className="text-xl font-bold mt-5 mb-7">Manage Task App</h1>
      </div>
      <div className="max-w-3xl w-full border border-gray-500 p-10 mx-auto rounded-xl">
        <h1 className="text-xl font-bold text-center">🔃 แก้ไขงาน</h1>
        <form onSubmit={handleUpdateTask} className="w-full space-y-4">
          <div>
            <label className="block mb-1">ชื่องาน</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              type="text"
              className="w-full border rounded-lg p-2"
              required
            />
          </div>
          <div>
            <label className="block mb-1">รายละเอียด</label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className="w-full border rounded-lg p-2"
              rows={5}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">อัปโหลดรูป</label>
            <input
              id="fileInput"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <label
              htmlFor="fileInput"
              className="inline-block cursor-pointer text-white hover:bg-violet-600 px-4 py-2 rounded border bg-violet-400 text-center"
            >
              เลือกรูป
            </label>
          </div>
          {previewImage && (
            <div className="mt-2">
              <img
                src={previewImage}
                alt="Preview"
                className="w-36 h-36 object-cover rounded-md"
              />
            </div>
          )}
          <div>
            <label className="block mb-1">สถานะ</label>
            <select
              className="w-full border rounded-lg p-2 mb-2"
              value={isCompleted ? "1" : "0"}
              onChange={(e) => setIsCompleted(e.target.value === "1")}
            >
              <option value="0">❌ ยังไม่เสร็จ</option>
              <option value="1">✔️ เสร็จแล้ว</option>
            </select>
          </div>
          <div>
            <button
              type="submit"
              className="text-white hover:bg-violet-600 block px-4 py-2 rounded border bg-violet-400 text-center"
            >
              บันทึกแก้ไขงาน
            </button>
          </div>
        </form>
        <Link
          href="/alltask"
          className="text-violet-400 hover:text-violet-600 block px-4 py-2 rounded text-center mt-10"
        >
          กลับไปหน้าแสดงงานทั้งหมด
        </Link>
      </div>
    </div>
  );
}