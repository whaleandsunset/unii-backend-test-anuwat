# เอกสาร API

เอกสารนี้อธิบาย API ของระบบสรุปยอดซื้อ-ขายรายสินค้า โดยเน้น endpoint ที่เกี่ยวข้องกับการนำข้อมูลเข้า
และการเรียกดูรายงานตามเงื่อนไขที่โจทย์กำหนด

Base URL สำหรับ local development:

```text
http://localhost:3000/api
```

## ภาพรวมการใช้งาน

ระบบมี flow หลักดังนี้:

```text
1. Sync product master data
   POST /api/imports/products/sync

2. Sync order data
   POST /api/imports/orders/sync

3. เรียกดูข้อมูลสำหรับ dropdown
   GET /api/categories
   GET /api/categories/:categoryId/sub-categories

4. เรียกดูรายงาน summary
   GET /api/product-summaries
```

ต้อง sync ข้อมูลสินค้าก่อนข้อมูล order เสมอ เพราะ `order_items` มี foreign key ไปยัง
`categories` และ `sub_categories`

## Response Format

API ทั้งหมดส่ง response เป็น JSON

ตัวเลขประเภทน้ำหนัก ราคา และยอดเงินใน summary response จะถูกส่งเป็น string เช่น `"588286.17"`
เพื่อรักษาความแม่นยำของค่าทศนิยมจาก PostgreSQL/Prisma Decimal

## 1. Import Data

Module นี้ใช้สำหรับนำข้อมูลจาก source URL หรือ request body เข้าฐานข้อมูล

Source URL ที่ใช้:

```text
PRODUCT_SOURCE_URL=https://apirecycle.unii.co.th/category/query-product-demo
ORDER_SOURCE_URL=https://apirecycle.unii.co.th/Stock/query-transaction-demo
```

### Sync product master data

```http
POST /api/imports/products/sync
```

ดึงข้อมูลจาก `PRODUCT_SOURCE_URL` แล้วบันทึกลงตาราง:

```text
categories
sub_categories
```

การทำงานหลัก:

- อ่าน `productList` จาก source
- upsert category ด้วย `categoryId`
- upsert subCategory ด้วย `subCategoryId`
- ผูก subCategory เข้ากับ category ผ่าน `categoryId`

ตัวอย่าง response:

```json
{
  "importedCategories": 14,
  "importedSubCategories": 264
}
```

### Sync orders

```http
POST /api/imports/orders/sync
```

ดึงข้อมูลจาก `ORDER_SOURCE_URL` แล้วบันทึกลงตาราง:

```text
orders
order_items
```

การทำงานหลัก:

- รวมข้อมูลจาก `buyTransaction` และ `sellTransaction`
- แปลง transaction ฝั่งซื้อเป็น `BUY`
- แปลง transaction ฝั่งขายเป็น `SELL`
- เก็บหัว order ลงตาราง `orders`
- แตกข้อมูลสินค้า/เกรดใน order ลงตาราง `order_items`
- เก็บเฉพาะ grade ที่ระบบรองรับ: `A`, `B`, `C`, `D`
- ถ้า source ส่ง `total` เป็น 0 ระบบจะ fallback เป็น `quantity * price`

ก่อนบันทึก order ระบบจะตรวจว่า `categoryId` และ `subCategoryId` มีอยู่ใน master data แล้วหรือไม่
ถ้ายังไม่มี จะ reject request เพื่อป้องกันข้อมูล relation ไม่ครบ

ตัวอย่าง response:

```json
{
  "importedOrders": 193,
  "importedItems": 1624
}
```

### Import products ผ่าน request body

```http
POST /api/imports/products
Content-Type: application/json
```

ใช้เมื่อมี payload ของ product อยู่แล้วและต้องการส่งเข้า API โดยตรง

รูปแบบ payload ต้องตรงกับ source:

```text
https://apirecycle.unii.co.th/category/query-product-demo
```

### Import orders ผ่าน request body

```http
POST /api/imports/orders
Content-Type: application/json
```

ใช้เมื่อมี payload ของ order อยู่แล้วและต้องการส่งเข้า API โดยตรง

รูปแบบ payload ต้องตรงกับ source:

```text
https://apirecycle.unii.co.th/Stock/query-transaction-demo
```

## 2. Categories

Module นี้ใช้สำหรับ dropdown ของหน้า filter โดยเฉพาะกรณีเลือก Category แล้วต้องจำกัดรายการ SubCategory
ให้ตรงกับ Category นั้น

### Get categories

```http
GET /api/categories
```

คืนรายการ category พร้อม subCategories

ตัวอย่าง response แบบย่อ:

```json
[
  {
    "categoryId": "01",
    "categoryName": "พลาสติก",
    "subCategories": [
      {
        "subCategoryId": "0101",
        "subCategoryName": "ขวดน้ำPETใสในเครือเป๊ปซี่"
      }
    ]
  }
]
```

### Get subcategories by category

```http
GET /api/categories/:categoryId/sub-categories
```

ใช้โหลดเฉพาะ subCategory ที่อยู่ใต้ category ที่เลือก

ตัวอย่าง:

```http
GET /api/categories/01/sub-categories
```

ตัวอย่าง response:

```json
[
  {
    "subCategoryId": "0101",
    "subCategoryName": "ขวดน้ำPETใสในเครือเป๊ปซี่"
  },
  {
    "subCategoryId": "0102",
    "subCategoryName": "ขวดน้ำPETใส"
  }
]
```

## 3. Orders

Module นี้ใช้สำหรับดูข้อมูล order ที่ถูก import แล้ว เหมาะสำหรับตรวจสอบข้อมูลต้นทางหลัง sync

### Get orders

```http
GET /api/orders
```

รองรับ query params:

| Query param | Required | รายละเอียด |
| --- | --- | --- |
| `startDate` | No | วันที่เริ่มต้นของ `order_finished_date`, format `YYYY-MM-DD` |
| `endDate` | No | วันที่สิ้นสุดของ `order_finished_date`, format `YYYY-MM-DD` |
| `orderId` | No | ค้นหาแบบ contains และไม่สนตัวพิมพ์เล็ก/ใหญ่ |

ตัวอย่าง:

```http
GET /api/orders?startDate=2024-04-01&endDate=2024-04-30&orderId=CUNIIPRO
```

### Get order detail

```http
GET /api/orders/:orderId
```

คืนข้อมูล order เดียวพร้อมรายการ items ภายใน order

ตัวอย่าง:

```http
GET /api/orders/CUNIIPRO20240409110012
```

## 4. Product Summaries

Endpoint หลักของ assignment สำหรับสรุปยอดซื้อ-ขายรายสินค้าในระดับ SubCategory

### Get product summaries

```http
GET /api/product-summaries
```

ข้อมูลที่สรุป:

- น้ำหนักซื้อรวม
- ยอดซื้อรวม
- น้ำหนักซื้อแยกตาม grade
- orderId ฝั่งซื้อ
- น้ำหนักขายรวม
- ยอดขายรวม
- น้ำหนักขายแยกตาม grade
- orderId ฝั่งขาย
- น้ำหนักคงเหลือ
- มูลค่าคงเหลือ

### Filters

API รองรับการส่งหลาย filter พร้อมกัน

| Query param | Required | รายละเอียด |
| --- | --- | --- |
| `startDate` | No | วันที่เริ่มต้นของ `order_finished_date`, format `YYYY-MM-DD` |
| `endDate` | No | วันที่สิ้นสุดของ `order_finished_date`, format `YYYY-MM-DD` |
| `categoryId` | No | กรองตาม category |
| `subCategoryId` | No | กรองตาม subCategory |
| `orderId` | No | ค้นหา order แบบ contains ด้วย `ILIKE %keyword%` |
| `minPrice` | No | ราคาต่อกิโลกรัมขั้นต่ำ |
| `maxPrice` | No | ราคาต่อกิโลกรัมสูงสุด |
| `grade` | No | `A`, `B`, `C`, หรือ `D` |

ตัวอย่าง:

```http
GET /api/product-summaries?startDate=2024-04-01&endDate=2024-04-30&categoryId=01&subCategoryId=0101&orderId=CUNIIPRO&minPrice=1&maxPrice=100&grade=A
```

### รายละเอียด logic ของ filter

`startDate` และ `endDate`

```text
กรองจาก orders.order_finished_date
ถ้าส่งทั้ง startDate และ endDate ระบบจะค้นหาแบบช่วงวัน
```

`categoryId` และ `subCategoryId`

```text
กรองจาก order_items.category_id และ order_items.sub_category_id
frontend ใช้ GET /api/categories/:categoryId/sub-categories เพื่อจำกัดตัวเลือก subCategory ให้ตรงกับ category
```

`orderId`

```text
ใช้ contains search แบบ case-insensitive
เช่น orderId=CUNIIPRO จะเจอ order_id ที่มีคำว่า CUNIIPRO อยู่ข้างใน
```

`minPrice` และ `maxPrice`

```text
กรองจาก order_items.price_per_kg
ใช้กับราคาต่อกิโลกรัมของ item ทั้งฝั่งซื้อและฝั่งขาย
```

`grade`

```text
ระบบ filter ที่ order_items.grade ก่อน aggregate
ดังนั้น quantity และ amount ที่สรุปออกมาจะเป็นยอดเฉพาะ grade ที่เลือก
```

### Response fields

| Field | Type | รายละเอียด |
| --- | --- | --- |
| `categoryId` | string | รหัส category |
| `categoryName` | string | ชื่อ category |
| `subCategoryId` | string | รหัส subCategory |
| `subCategoryName` | string | ชื่อ subCategory |
| `buyQuantityKg` | string | น้ำหนักซื้อรวม |
| `buyTotalAmount` | string | ยอดซื้อรวม |
| `buyMinPricePerKg` | string/null | ราคาซื้อต่ำสุดต่อกิโลกรัม โดยไม่นับ 0 |
| `buyMaxPricePerKg` | string/null | ราคาซื้อสูงสุดต่อกิโลกรัม |
| `buyOrderIds` | string[] | orderId ฝั่งซื้อที่เกี่ยวข้อง |
| `buyGradeBreakdown` | array | น้ำหนักซื้อแยกตาม grade |
| `sellQuantityKg` | string | น้ำหนักขายรวม |
| `sellTotalAmount` | string | ยอดขายรวม |
| `sellMinPricePerKg` | string/null | ราคาขายต่ำสุดต่อกิโลกรัม โดยไม่นับ 0 |
| `sellMaxPricePerKg` | string/null | ราคาขายสูงสุดต่อกิโลกรัม |
| `sellOrderIds` | string[] | orderId ฝั่งขายที่เกี่ยวข้อง |
| `sellGradeBreakdown` | array | น้ำหนักขายแยกตาม grade |
| `remainingQuantityKg` | string | น้ำหนักคงเหลือ = ซื้อรวม - ขายรวม |
| `remainingAmount` | string | มูลค่าคงเหลือ = ยอดซื้อรวม - ยอดขายรวม |

โครงสร้างของ grade breakdown:

```json
{
  "grade": "A",
  "quantityKg": "337840.89"
}
```

ระบบจะไม่แสดง grade ที่มียอด `0 กก.` ใน breakdown เพื่อลด noise บนหน้า UI

ตัวอย่าง response แบบย่อ:

```json
[
  {
    "categoryId": "01",
    "categoryName": "พลาสติก",
    "subCategoryId": "0101",
    "subCategoryName": "ขวดน้ำPETใสในเครือเป๊ปซี่",
    "buyQuantityKg": "588286.17",
    "buyTotalAmount": "6942596.82",
    "buyMinPricePerKg": "1",
    "buyMaxPricePerKg": "66",
    "buyOrderIds": ["CUNIIPRO20240409110012"],
    "buyGradeBreakdown": [
      {
        "grade": "A",
        "quantityKg": "337840.89"
      }
    ],
    "sellQuantityKg": "91181.36",
    "sellTotalAmount": "2226937.76",
    "sellMinPricePerKg": "15",
    "sellMaxPricePerKg": "66",
    "sellOrderIds": ["UNII20240507100042"],
    "sellGradeBreakdown": [
      {
        "grade": "A",
        "quantityKg": "87801.36"
      }
    ],
    "remainingQuantityKg": "497104.81",
    "remainingAmount": "4715659.06"
  }
]
```

## Validation และ Error Handling

ระบบเปิดใช้ NestJS ValidationPipe สำหรับ query/body ที่มี DTO

ตัวอย่าง error ที่อาจเกิดขึ้น:

| กรณี | HTTP Status | รายละเอียด |
| --- | --- | --- |
| ไม่ได้ตั้งค่า source URL | `400` | ยังไม่มี `ORDER_SOURCE_URL` หรือ `PRODUCT_SOURCE_URL` |
| source API ตอบกลับไม่สำเร็จ | `400` | request ไป source URL ไม่สำเร็จ |
| import order ก่อน product master | `400` | category/subCategory ที่ order อ้างถึงยังไม่มีใน database |
| ส่ง grade ไม่ถูกต้อง | `400` | ต้องเป็น `A`, `B`, `C`, หรือ `D` |

## หมายเหตุสำหรับการทดสอบ

ลำดับที่แนะนำหลัง setup database:

```bash
curl -X POST http://localhost:3000/api/imports/products/sync
curl -X POST http://localhost:3000/api/imports/orders/sync
curl "http://localhost:3000/api/product-summaries?categoryId=01&grade=A"
```
