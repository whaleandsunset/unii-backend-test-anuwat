# API Document

เอกสารนี้สรุป API ของระบบสรุปยอดซื้อ-ขายรายสินค้า โดยแยกตามหน้าที่ของแต่ละ module
และอธิบายจุดสำคัญที่เกี่ยวข้องกับโจทย์ เช่น การ sync ข้อมูล, การ filter หลายเงื่อนไข,
การค้นหา orderId และการคำนวณยอดตาม grade

Base URL สำหรับ local development:

```text
http://localhost:3000/api
```

## ภาพรวมการทำงาน

ระบบไม่ได้คำนวณรายงานจากไฟล์ JSON โดยตรง แต่จะนำข้อมูลจาก source API เข้าฐานข้อมูลก่อน
จากนั้น summary API จะอ่านข้อมูลจาก PostgreSQL เพื่อคำนวณผลลัพธ์ตาม filter ที่ส่งเข้ามา

ลำดับการใช้งานหลังจาก setup database แล้ว:

```text
1. Sync ข้อมูลสินค้า
   POST /api/imports/products/sync

2. Sync ข้อมูล order
   POST /api/imports/orders/sync

3. โหลด category/subCategory สำหรับ filter
   GET /api/categories
   GET /api/categories/:categoryId/sub-categories

4. เรียกดูรายงานสรุป
   GET /api/product-summaries
```

ต้อง sync product master data ก่อน order เสมอ เพราะ order item ต้องอ้างอิง
`categoryId` และ `subCategoryId` ที่มีอยู่ในระบบแล้ว

## Response Convention

API ส่ง response เป็น JSON ทั้งหมด

สำหรับ summary response ค่าเงิน น้ำหนัก และราคาต่อกิโลกรัมจะส่งเป็น string เช่น:

```json
{
  "buyQuantityKg": "588286.17",
  "buyTotalAmount": "6942596.82"
}
```

เหตุผลคือค่ากลุ่มนี้มาจาก `Decimal` ใน PostgreSQL/Prisma การส่งเป็น string ช่วยลดปัญหา precision
ของ JavaScript number และทำให้ frontend format ตัวเลขเองได้ชัดเจน

## Import APIs

Import APIs ใช้สำหรับนำข้อมูลจาก source เข้าฐานข้อมูล มีทั้งแบบ sync จาก URL และแบบส่ง payload
เข้ามาทาง request body

Source URL ที่ config ผ่าน `.env`:

```text
PRODUCT_SOURCE_URL=https://apirecycle.unii.co.th/category/query-product-demo
ORDER_SOURCE_URL=https://apirecycle.unii.co.th/Stock/query-transaction-demo
```

### Sync Product Master Data

```http
POST /api/imports/products/sync
```

Endpoint นี้ดึงข้อมูลจาก `PRODUCT_SOURCE_URL` แล้วบันทึกลง:

```text
categories
sub_categories
```

สิ่งที่ service ทำ:

- อ่าน `productList` จาก source
- upsert category ด้วย `categoryId`
- upsert subCategory ด้วย `subCategoryId`
- ผูก subCategory กับ category ผ่าน `categoryId`

ตัวอย่าง response:

```json
{
  "importedCategories": 14,
  "importedSubCategories": 264
}
```

### Sync Orders

```http
POST /api/imports/orders/sync
```

Endpoint นี้ดึงข้อมูลจาก `ORDER_SOURCE_URL` แล้วบันทึกลง:

```text
orders
order_items
```

สิ่งที่ service ทำ:

- อ่านข้อมูลจาก `buyTransaction` และ `sellTransaction`
- map รายการซื้อเป็น `transactionType = BUY`
- map รายการขายเป็น `transactionType = SELL`
- บันทึกหัว order ลง `orders`
- แตกข้อมูลรายการสินค้า/grade ลง `order_items`
- เก็บเฉพาะ grade ที่รองรับคือ `A`, `B`, `C`, `D`
- ถ้า source ส่ง `total` เป็น `0` จะคำนวณ fallback จาก `quantity * price`

ก่อนบันทึก order ระบบจะตรวจ master data ก่อน ถ้า order อ้างถึง category/subCategory ที่ยังไม่มี
จะตอบ error กลับไป เพื่อป้องกันไม่ให้ข้อมูล relation ขาด

ตัวอย่าง response:

```json
{
  "importedOrders": 193,
  "importedItems": 1624
}
```

### Import Product Payload

```http
POST /api/imports/products
Content-Type: application/json
```

ใช้สำหรับกรณีที่มี product payload อยู่แล้วและต้องการส่งเข้า API โดยตรง
รูปแบบ payload ต้องตรงกับ source `query-product-demo`

### Import Order Payload

```http
POST /api/imports/orders
Content-Type: application/json
```

ใช้สำหรับกรณีที่มี order payload อยู่แล้วและต้องการส่งเข้า API โดยตรง
รูปแบบ payload ต้องตรงกับ source `query-transaction-demo`

## Category APIs

API กลุ่มนี้ใช้สำหรับ dropdown/filter ของหน้า UI

### Get Categories

```http
GET /api/categories
```

คืนรายการ category พร้อม subCategories ภายใต้ category นั้น

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

### Get SubCategories By Category

```http
GET /api/categories/:categoryId/sub-categories
```

ใช้เมื่อต้องการจำกัดตัวเลือก SubCategory ให้ตรงกับ Category ที่เลือก

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

## Order APIs

API กลุ่มนี้ใช้สำหรับตรวจสอบ order ที่ถูก import แล้ว ไม่ใช่ endpoint หลักของรายงาน
แต่ช่วย debug หรือ verify ข้อมูลต้นทางได้

### Get Orders

```http
GET /api/orders
```

Query params:

| Query param | Required | รายละเอียด |
| --- | --- | --- |
| `startDate` | No | วันที่เริ่มต้นของ `order_finished_date`, format `YYYY-MM-DD` |
| `endDate` | No | วันที่สิ้นสุดของ `order_finished_date`, format `YYYY-MM-DD` |
| `orderId` | No | ค้นหาแบบ contains และไม่สนตัวพิมพ์เล็ก/ใหญ่ |

ตัวอย่าง:

```http
GET /api/orders?startDate=2024-04-01&endDate=2024-04-30&orderId=CUNIIPRO
```

### Get Order Detail

```http
GET /api/orders/:orderId
```

คืนข้อมูล order เดียวพร้อม items ภายใน order

ตัวอย่าง:

```http
GET /api/orders/CUNIIPRO20240409110012
```

## Product Summary API

Endpoint นี้เป็น API หลักของ assignment ใช้สรุปยอดซื้อ-ขายในระดับ SubCategory
และรองรับ filter หลายเงื่อนไขพร้อมกัน

```http
GET /api/product-summaries
```

ผลลัพธ์ในแต่ละแถวคือ summary ของ 1 SubCategory ภายใต้ Category นั้น ๆ

ข้อมูลที่ API คำนวณให้:

- น้ำหนักซื้อรวม
- ยอดซื้อรวม
- น้ำหนักซื้อแยกตาม grade
- orderId ฝั่งซื้อที่เกี่ยวข้อง
- น้ำหนักขายรวม
- ยอดขายรวม
- น้ำหนักขายแยกตาม grade
- orderId ฝั่งขายที่เกี่ยวข้อง
- น้ำหนักคงเหลือ
- มูลค่าคงเหลือ

### Filters

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

ตัวอย่างการเรียกหลาย filter พร้อมกัน:

```http
GET /api/product-summaries?startDate=2024-04-01&endDate=2024-04-30&categoryId=01&subCategoryId=0101&orderId=CUNIIPRO&minPrice=1&maxPrice=100&grade=A
```

### Filter Behavior

`startDate` และ `endDate`

```text
กรองจาก orders.order_finished_date
ถ้าส่งทั้งสองค่า ระบบจะค้นหาแบบช่วงวันที่
```

`categoryId` และ `subCategoryId`

```text
กรองจาก order_items.category_id และ order_items.sub_category_id
```

`orderId`

```text
ใช้ contains search แบบ case-insensitive
เช่น orderId=CUNIIPRO จะเจอทั้ง CUNIIPRO20240409110012 และ order อื่นที่มีคำนี้อยู่ในเลข order
```

`minPrice` และ `maxPrice`

```text
กรองจาก order_items.price_per_kg
ใช้กับ item ทั้งฝั่งซื้อและฝั่งขาย
```

`grade`

```text
กรองที่ order_items.grade ก่อน aggregate
ดังนั้นถ้าเลือก grade=A ยอดรวมทั้งหมดจะคำนวณจาก item grade A เท่านั้น
```

### Response Fields

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

ระบบจะไม่ส่ง grade ที่มียอด `0 กก.` ออกมาใน breakdown เพื่อลดข้อมูลที่ไม่จำเป็นบนหน้า UI

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

## Error Handling

ระบบใช้ `ValidationPipe` ของ NestJS สำหรับ validate query/body ที่ผูกกับ DTO

ตัวอย่าง error ที่ออกแบบไว้:

| กรณี | HTTP Status | รายละเอียด |
| --- | --- | --- |
| ไม่ได้ตั้งค่า source URL | `400` | ยังไม่มี `ORDER_SOURCE_URL` หรือ `PRODUCT_SOURCE_URL` |
| source API ตอบกลับไม่สำเร็จ | `400` | เรียก source URL ไม่สำเร็จ |
| import order ก่อน product master | `400` | order อ้างถึง category/subCategory ที่ยังไม่มี |
| ส่ง grade ไม่ถูกต้อง | `400` | ต้องเป็น `A`, `B`, `C`, หรือ `D` |

## ตัวอย่างการทดสอบด้วย curl

```bash
curl -X POST http://localhost:3000/api/imports/products/sync
curl -X POST http://localhost:3000/api/imports/orders/sync
curl "http://localhost:3000/api/product-summaries?categoryId=01&grade=A"
```
