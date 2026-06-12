# เอกสาร API

Base URL สำหรับ local development:

```text
http://localhost:3000/api
```

เอกสารนี้สรุป endpoint ที่ใช้ในระบบ โดยแบ่งตาม module ของ backend และระบุ filter ที่เกี่ยวข้องกับหน้ารายงาน

## 1. Import Data

ก่อนเรียก summary ต้องมีข้อมูลใน database ก่อน โดยลำดับที่ถูกต้องคือ sync products ก่อน แล้วจึง sync orders

### Sync product master data

```http
POST /api/imports/products/sync
```

ใช้ดึงข้อมูลจาก `PRODUCT_SOURCE_URL` แล้วบันทึกลง:

```text
categories
sub_categories
```

### Sync orders

```http
POST /api/imports/orders/sync
```

ใช้ดึงข้อมูลจาก `ORDER_SOURCE_URL` แล้วบันทึกลง:

```text
orders
order_items
```

ถ้า order อ้างถึง `categoryId` หรือ `subCategoryId` ที่ยังไม่มีใน master data ระบบจะ reject request
เพื่อป้องกันข้อมูลไม่ครบ relation

### Import ผ่าน request body

รองรับไว้สำหรับกรณีที่มี payload อยู่แล้วและต้องการส่งเข้า API โดยตรง

```http
POST /api/imports/products
POST /api/imports/orders
```

รูปแบบ payload ต้องตรงกับ source เดิม:

```text
https://apirecycle.unii.co.th/category/query-product-demo
https://apirecycle.unii.co.th/Stock/query-transaction-demo
```

## 2. Categories

### Get categories

```http
GET /api/categories
```

คืนรายการ category พร้อม subCategories ใช้สำหรับสร้างตัวเลือกในหน้า filter

### Get subcategories by category

```http
GET /api/categories/:categoryId/sub-categories
```

ใช้เมื่อต้องการโหลดเฉพาะ subCategory ที่อยู่ใต้ category ที่เลือก

ตัวอย่าง:

```http
GET /api/categories/01/sub-categories
```

## 3. Orders

### Get orders

```http
GET /api/orders
```

รองรับ filter:

| Query param | รายละเอียด |
| --- | --- |
| `startDate` | วันที่เริ่มต้นของ `order_finished_date` |
| `endDate` | วันที่สิ้นสุดของ `order_finished_date` |
| `orderId` | ค้นหาแบบ contains และไม่สนตัวพิมพ์เล็ก/ใหญ่ |

### Get order detail

```http
GET /api/orders/:orderId
```

คืน order เดียวพร้อมรายการ items ภายใน order

## 4. Product Summaries

### Get product summaries

```http
GET /api/product-summaries
```

เป็น endpoint หลักของรายงาน สรุปยอดซื้อ-ขายในระดับ `SubCategory`

### Filters

API รองรับการส่งหลาย filter พร้อมกัน:

| Query param | รายละเอียด |
| --- | --- |
| `startDate` | วันที่เริ่มต้นของ `order_finished_date`, format `YYYY-MM-DD` |
| `endDate` | วันที่สิ้นสุดของ `order_finished_date`, format `YYYY-MM-DD` |
| `categoryId` | กรองตาม category |
| `subCategoryId` | กรองตาม subCategory |
| `orderId` | ค้นหา order แบบ contains ด้วย `ILIKE %keyword%` |
| `minPrice` | ราคาต่อกิโลกรัมขั้นต่ำ |
| `maxPrice` | ราคาต่อกิโลกรัมสูงสุด |
| `grade` | `A`, `B`, `C`, หรือ `D` |

ตัวอย่าง:

```http
GET /api/product-summaries?startDate=2024-04-01&endDate=2024-04-30&categoryId=01&subCategoryId=0101&orderId=CUNIIPRO&minPrice=1&maxPrice=100&grade=A
```

### รายละเอียด logic ของ filter

`orderId`

```text
ใช้ contains search แบบ case-insensitive
เช่น orderId=CUNIIPRO จะเจอ order_id ที่มีคำว่า CUNIIPRO อยู่ข้างใน
```

`grade`

```text
ระบบ filter order_items ตาม grade ก่อน aggregate
ดังนั้น quantity/amount ที่สรุปออกมาจะเป็นยอดเฉพาะ grade ที่เลือก
```

`minPrice` และ `maxPrice`

```text
ใช้กรองจาก order_items.price_per_kg
```

### Response fields

| Field | รายละเอียด |
| --- | --- |
| `categoryId` | รหัส category |
| `categoryName` | ชื่อ category |
| `subCategoryId` | รหัส subCategory |
| `subCategoryName` | ชื่อ subCategory |
| `buyQuantityKg` | น้ำหนักซื้อรวม |
| `buyTotalAmount` | ยอดซื้อรวม |
| `buyMinPricePerKg` | ราคาซื้อต่ำสุดต่อกิโลกรัม โดยไม่นับ 0 |
| `buyMaxPricePerKg` | ราคาซื้อสูงสุดต่อกิโลกรัม |
| `buyOrderIds` | orderId ฝั่งซื้อที่เกี่ยวข้อง |
| `buyGradeBreakdown` | น้ำหนักซื้อแยกตาม grade |
| `sellQuantityKg` | น้ำหนักขายรวม |
| `sellTotalAmount` | ยอดขายรวม |
| `sellMinPricePerKg` | ราคาขายต่ำสุดต่อกิโลกรัม โดยไม่นับ 0 |
| `sellMaxPricePerKg` | ราคาขายสูงสุดต่อกิโลกรัม |
| `sellOrderIds` | orderId ฝั่งขายที่เกี่ยวข้อง |
| `sellGradeBreakdown` | น้ำหนักขายแยกตาม grade |
| `remainingQuantityKg` | น้ำหนักคงเหลือ = ซื้อรวม - ขายรวม |
| `remainingAmount` | มูลค่าคงเหลือ = ยอดซื้อรวม - ยอดขายรวม |

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
      { "grade": "A", "quantityKg": "337840.89" }
    ],
    "sellQuantityKg": "91181.36",
    "sellTotalAmount": "2226937.76",
    "sellMinPricePerKg": "15",
    "sellMaxPricePerKg": "66",
    "sellOrderIds": ["UNII20240507100042"],
    "sellGradeBreakdown": [
      { "grade": "A", "quantityKg": "87801.36" }
    ],
    "remainingQuantityKg": "497104.81",
    "remainingAmount": "4715659.06"
  }
]
```
