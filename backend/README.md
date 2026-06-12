# Unii Product Trade Summary API

Backend สำหรับระบบสรุปยอดซื้อ-ขายรายสินค้า พัฒนาด้วย NestJS, Prisma และ PostgreSQL

แนวคิดหลักของระบบคือดึงข้อมูลจาก source ที่โจทย์ให้มา 2 ชุด ได้แก่ข้อมูลสินค้า
`Category/SubCategory` และข้อมูล `Order` จากนั้น normalize ข้อมูลให้อยู่ในรูปแบบ relational database
เพื่อให้ query summary ตามเงื่อนไขต่าง ๆ ได้ง่ายและชัดเจน

## Stack ที่ใช้

- NestJS สำหรับจัดโครงสร้าง API
- Prisma สำหรับเชื่อมต่อ PostgreSQL
- PostgreSQL สำหรับเก็บข้อมูลแบบ relational
- TypeScript

## Source Data

ข้อมูลสินค้า:

```text
https://apirecycle.unii.co.th/category/query-product-demo
```

ข้อมูล order:

```text
https://apirecycle.unii.co.th/Stock/query-transaction-demo
```

## โครงสร้างหลักของโปรเจกต์

```text
src/
  main.ts                  bootstrap NestJS, prefix, validation, port
  app.module.ts            รวม module หลักของระบบ
  config/                  map ค่า environment
  common/                  constants และ utility ที่ใช้ร่วมกัน
  prisma/                  PrismaService สำหรับเชื่อมต่อ database
  categories/              API สำหรับ Category/SubCategory
  orders/                  API สำหรับอ่านข้อมูล order
  summaries/               API สำหรับสรุปยอดซื้อ-ขาย
  imports/                 API สำหรับ sync/import ข้อมูลจาก source

prisma/
  schema.prisma            model และ index ของ database
  migrations/              migration สำหรับสร้าง schema

docs/
  API.md                   รายละเอียด endpoint และ filter
  DATABASE.md              รายละเอียดการออกแบบ database
```

## โครงสร้างข้อมูล

ระบบแบ่งข้อมูลออกเป็น 4 ตารางหลัก:

```text
categories
sub_categories
orders
order_items
```

ความสัมพันธ์หลัก:

```text
categories     1 -> many sub_categories
orders         1 -> many order_items
categories     1 -> many order_items
sub_categories 1 -> many order_items
```

ออกแบบให้ `order_items` เป็นตารางหลักสำหรับคำนวณ summary เพราะเป็นระดับข้อมูลที่ละเอียดที่สุด
และมีข้อมูลที่จำเป็นครบ เช่น `grade`, `quantity_kg`, `price_per_kg`, `total_amount`,
`category_id` และ `sub_category_id`

รายละเอียด schema และเหตุผลในการออกแบบอยู่ใน:

```text
docs/DATABASE.md
```

## การตั้งค่า

สร้างไฟล์ `.env` จากตัวอย่าง:

```bash
cp .env.example .env
```

ตัวอย่างค่า config:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/product_trade_summary?schema=public"
PORT=3000
API_PREFIX=api
ORDER_SOURCE_URL="https://apirecycle.unii.co.th/Stock/query-transaction-demo"
PRODUCT_SOURCE_URL="https://apirecycle.unii.co.th/category/query-product-demo"
```

ไฟล์ `.env` ไม่ควร commit ขึ้น repository เพราะเป็นค่า local ของแต่ละเครื่อง

## ติดตั้งและเตรียม database

ติดตั้ง dependencies:

```bash
npm install
npm run prisma:generate
```

สร้าง database ใน PostgreSQL ก่อน เช่น:

```text
product_trade_summary
```

จากนั้นรัน migration:

```bash
npm run prisma:migrate
```

Migration จะสร้าง table, foreign key และ index ที่ใช้สำหรับ filter/report

## การนำข้อมูลเข้า

ควร sync ข้อมูลสินค้าเข้าก่อน แล้วค่อย sync ข้อมูล order เพราะ `order_items`
ต้องอ้างอิง `categories` และ `sub_categories`

ลำดับที่ใช้:

```text
1. POST /api/imports/products/sync
2. POST /api/imports/orders/sync
```

ตัวอย่าง:

```bash
curl -X POST http://localhost:3000/api/imports/products/sync
curl -X POST http://localhost:3000/api/imports/orders/sync
```

ระบบยังรองรับการส่ง JSON payload เข้า API โดยตรง:

```http
POST /api/imports/products
POST /api/imports/orders
```

## การรัน

Development:

```bash
npm run start:dev
```

Build และรันแบบ compiled:

```bash
npm run build
npm run start
```

Base URL:

```text
http://localhost:3000/api
```

## Endpoint สำคัญ

```http
GET  /api/categories
GET  /api/categories/:categoryId/sub-categories
GET  /api/orders
GET  /api/orders/:orderId
GET  /api/product-summaries
POST /api/imports/products
POST /api/imports/products/sync
POST /api/imports/orders
POST /api/imports/orders/sync
```

รายละเอียด endpoint อยู่ใน:

```text
docs/API.md
```

## Summary API

API หลักของงานนี้คือ:

```http
GET /api/product-summaries
```

รองรับ filter หลายตัวพร้อมกัน:

| Query param | รายละเอียด |
| --- | --- |
| `startDate` | วันที่เริ่มต้นของ `order_finished_date` |
| `endDate` | วันที่สิ้นสุดของ `order_finished_date` |
| `categoryId` | รหัส category |
| `subCategoryId` | รหัส subCategory |
| `orderId` | ค้นหาแบบ contains และไม่สนตัวพิมพ์เล็ก/ใหญ่ |
| `minPrice` | ราคาต่อกิโลกรัมขั้นต่ำ |
| `maxPrice` | ราคาต่อกิโลกรัมสูงสุด |
| `grade` | `A`, `B`, `C`, หรือ `D` |

ตัวอย่าง:

```http
GET /api/product-summaries?categoryId=01&subCategoryId=0101&orderId=CUNIIPRO&minPrice=1&maxPrice=100&grade=A
```

สำหรับ `orderId` ระบบเลือกใช้ contains search ด้วย `ILIKE %keyword%`
เพราะ UI เป็นช่องค้นหาและเหมาะกับการพิมพ์บางส่วนของเลขคำสั่งซื้อ

เมื่อเลือก `grade` ระบบจะ filter ที่ระดับ `order_items` ก่อน แล้วค่อย aggregate
ดังนั้นยอดรวมที่ได้จะเป็นยอดเฉพาะ grade นั้นจริง ๆ

## ตรวจสอบก่อนส่งงาน

```bash
npm run lint
npm run build
```

