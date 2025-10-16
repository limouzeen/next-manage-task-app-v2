"use client";

import Image from "next/image";
import tasklogo from "./../../assets/images/tasklogo.png";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

// 1. **IMPORT FIREBASE (สำหรับ DB) และ SUPABASE (สำหรับ STORAGE)**
import { db } from "./../../lib/firebaseClient"; // ใช้สำหรับ Firestore
import { collection, addDoc } from "firebase/firestore";
import { supabase } from "./../../lib/supabaseClient"; // <-- IMPORT SUPABASE CLIENT

// **กำหนดชื่อ Collection**
const COLLECTION_NAME = "task_tb";
const SUPABASE_BUCKET_NAME = "task_bk"; // <-- ชื่อ Bucket ใน Supabase

// Interface สำหรับข้อมูลใน Firestore (ไม่มีการเปลี่ยนแปลง)
interface NewTaskData {
  title: string;
  detail: string;
  image_url: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export default function Page() {
  const [title, setTitle] = useState<string>('');
  const [detail, setDetail] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null); // เปลี่ยนชื่อ state ให้ชัดว่าเป็น File
  const [is_completed, setIsCompleted] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const router = useRouter();

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSaveTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let imageUrl: string = "";

    // 2. **🔥 อัปโหลดรูปภาพขึ้น SUPABASE STORAGE**
    if (imageFile) {
      const filePath = `${Date.now()}-${imageFile.name}`;
      try {
        // อัปโหลดไฟล์ไปที่ Bucket ที่กำหนด
        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_BUCKET_NAME)
          .upload(filePath, imageFile);

        if (uploadError) {
          throw uploadError; // ถ้ามี error ให้โยนไปที่ catch block
        }

        // ดึง Public URL ของไฟล์ที่เพิ่งอัปโหลด
        const { data } = supabase.storage
          .from(SUPABASE_BUCKET_NAME)
          .getPublicUrl(filePath);
        
        imageUrl = data.publicUrl; // นี่คือ URL ที่จะเก็บลง Firestore

      } catch (error) {
        console.error("อัปโหลดรูปไป Supabase ไม่สำเร็จ:", error);
        alert("อัปโหลดรูปไม่สำเร็จ");
        return;
      }
    }

    // 3. **บันทึกข้อมูลลง FIREBASE FIRESTORE (ส่วนนี้เหมือนเดิม)**
    try {
      const taskData: NewTaskData = {
        title: title,
        detail: detail,
        image_url: imageUrl, // <-- ใช้ URL จาก Supabase
        is_completed: is_completed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await addDoc(collection(db, COLLECTION_NAME), taskData);

      alert("บันทึกข้อมูลเรียบร้อย");
      if(previewImage) {
        URL.revokeObjectURL(previewImage);
      }
      router.push("/alltask");

    } catch (error) {
      console.error("บันทึกข้อมูลลง Firestore ไม่สำเร็จ:", error);
      alert("บันทึกข้อมูลไม่สำเร็จ");
    }
  };

  return (
    <div className="pt-20">
      {/* ส่วน JSX อื่นๆ ไม่มีการเปลี่ยนแปลง */}
      <div className="flex flex-col items-center">
        <Image src={tasklogo} alt="tasklogo" width={100} height={100} />
        <h1 className="text-xl font-bold mt-5 mb-7">Manage Task App</h1>
      </div>
      <div className="w-3xl border border-gray-500 p-10 mx-auto rounded-xl">
        <h1 className="text-xl font-bold text-center">➕ เพิ่มงานใหม่</h1>
        <form onSubmit={handleSaveTask} className="w-full space-y-4">
          <div>
            <label>ชื่องาน</label>
            <input
              onChange={(e) => setTitle(e.target.value)}
              type="text"
              className="w-full border rounded-lg p-2"
              required
            />
          </div>
          <div>
            <label>รายละเอียด</label>
            <textarea
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
            <label htmlFor="fileInput" className="inline-block cursor-pointer text-white hover:bg-violet-600 px-4 py-2 rounded border bg-violet-400 text-center">
              เลือกรูป
            </label>
          </div>
          {previewImage && (
            <div className="mt-2">
              <Image
                src={previewImage}
                alt="Preview"
                width={150}
                height={150}
                sizes="150px"
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}
          <div>
            <label>สถานะ</label>
            <select className="w-full border rounded-lg p-2 mb-2"
              value={is_completed? "1" : "0"}
              onChange={(e) => setIsCompleted(e.target.value === "1")}>
              <option value="0">❌ ยังไม่เสร็จ</option>
              <option value="1">✔️ เสร็จแล้ว</option>
            </select>
          </div>
          <div>
            <button type="submit" className="text-white hover:bg-violet-600 block px-4 py-2 rounded border bg-violet-400 text-center">
              บันทึกงานใหม่
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