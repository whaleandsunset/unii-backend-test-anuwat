# Product Trade Summary Frontend

Frontend สำหรับดูรายงานสรุปยอดซื้อ-ขายรายสินค้า ใช้ React + Vite

หน้านี้ออกแบบให้ทำงานคู่กับ backend โดยส่ง filter ไปที่ `GET /api/product-summaries`
และแสดงผลในรูปแบบตาราง summary ตาม SubCategory

## Stack

- React
- TypeScript
- Vite
- Lucide React

## สิ่งที่หน้านี้รองรับ

- filter ช่วงวันที่
- filter Category/SubCategory
- จำกัดตัวเลือก SubCategory ตาม Category ที่เลือก
- filter orderId แบบ contains
- filter ช่วงราคา
- filter grade A/B/C/D
- โหลดข้อมูลใหม่อัตโนมัติเมื่อ filter เปลี่ยน โดยมี debounce
- ยังคงมีปุ่มค้นหาไว้สำหรับสั่งค้นหาเอง
- แสดงยอดซื้อ/ขาย แยก grade และแถวรวมท้ายตาราง

## โครงสร้างไฟล์

```text
src/
  App.tsx                    จัดการ state หลักและการโหลดข้อมูล
  api.ts                     รวม type และ function สำหรับเรียก backend
  constants.ts               ค่าคงที่ของ frontend เช่น grade
  main.tsx                   entry point
  styles.css                 style หลักของหน้า

  components/
    FilterPanel.tsx          ส่วนตัวกรองข้อมูล
    SummaryTable.tsx         ตาราง summary
    GradeChips.tsx           แสดง quantity แยกตาม grade

  utils/
    format.ts                format ตัวเลข, orderId, ช่วงราคา
```

## Environment

ถ้าต้องการเปลี่ยน backend URL ให้สร้าง `.env` จาก `.env.example`

```bash
cp .env.example .env
```

ค่าเริ่มต้น:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## การรัน

ติดตั้ง dependencies:

```bash
npm install
```

รัน development server:

```bash
npm run dev
```

Vite จะเปิดที่:

```text
http://localhost:5173
```

ก่อนรัน frontend ควรรัน backend ไว้ที่:

```text
http://localhost:3000/api
```

## Build

```bash
npm run build
```

## API ที่ใช้งาน

โหลด category สำหรับ dropdown:

```http
GET /api/categories
```

โหลดข้อมูล summary:

```http
GET /api/product-summaries
```

query params ที่ frontend ส่งไป:

| UI Field | Query param |
| --- | --- |
| วันที่เริ่มต้น | `startDate` |
| วันที่สิ้นสุด | `endDate` |
| หมวดหมู่ | `categoryId` |
| หมวดหมู่ย่อย | `subCategoryId` |
| หมายเลขคำสั่งซื้อ | `orderId` |
| ราคาเริ่มต้น | `minPrice` |
| ราคาสุดท้าย | `maxPrice` |
| เกรด | `grade` |



