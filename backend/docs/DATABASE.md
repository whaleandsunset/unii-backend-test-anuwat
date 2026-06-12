# เอกสารออกแบบฐานข้อมูล

เอกสารนี้อธิบายแนวคิดการออกแบบฐานข้อมูลของระบบสรุปยอดซื้อ-ขายรายสินค้า
โดยอ้างอิงจากข้อมูล 2 แหล่งที่โจทย์กำหนด:

```text
1. Product master data: Category / SubCategory
2. Order transaction data: Buy / Sell orders
```

ระบบเลือกใช้ PostgreSQL เพราะข้อมูลมีความสัมพันธ์ชัดเจน และรายงานต้อง query แบบ join/aggregate
หลายเงื่อนไขพร้อมกัน เช่น วันที่, category, subCategory, grade, ราคา และ orderId

## เป้าหมายของ schema

การออกแบบฐานข้อมูลในโปรเจกต์นี้มีเป้าหมายหลักดังนี้:

- เก็บข้อมูลสินค้าเป็น master data เพื่อไม่ให้ชื่อ category/subCategory ซ้ำในทุก order
- เก็บ order และ order item เป็น transaction data เพื่อรองรับการคำนวณย้อนหลัง
- รองรับการ filter หลายเงื่อนไขพร้อมกันตามโจทย์
- รองรับการ group summary ในระดับ SubCategory ภายใต้ Category
- ทำให้ frontend จำกัดตัวเลือก SubCategory ตาม Category ได้ง่าย
- วาง index ตาม field ที่ถูกใช้ค้นหาและ aggregate บ่อย

## การแบ่งข้อมูล

โครงสร้างข้อมูลถูกแยกออกเป็น 2 กลุ่ม:

```text
Master data
  - categories
  - sub_categories

Transaction data
  - orders
  - order_items
```

แนวทางนี้ช่วยให้ข้อมูลสินค้าเป็นแหล่งอ้างอิงเดียว และช่วยให้ summary query สามารถ join เพื่อดึงชื่อสินค้า
พร้อมกับคำนวณยอดซื้อ-ขายจาก transaction data ได้โดยตรง

## ERD แบบย่อ

```text
categories
  1 -> many sub_categories
  1 -> many order_items

sub_categories
  1 -> many order_items

orders
  1 -> many order_items
```

มุมมองแบบ flow:

```text
categories
  └── sub_categories

orders
  └── order_items
        ├── category_id      -> categories.category_id
        └── sub_category_id  -> sub_categories.sub_category_id
```

`order_items` เป็นตารางสำคัญที่สุดของรายงาน เพราะเป็นระดับข้อมูลที่มี category, subCategory,
grade, quantity, price และ amount ครบในแถวเดียว

## ตารางหลัก

### 1. categories

เก็บหมวดหมู่หลักของสินค้า เช่น พลาสติก, โลหะ, กระดาษ

| Column | Type | รายละเอียด |
| --- | --- | --- |
| `id` | UUID | primary key ภายในระบบ |
| `category_id` | varchar(50) | รหัส category จาก source ใช้เป็น unique key |
| `category_name` | varchar(255) | ชื่อ category |
| `created_at` | timestamp | วันที่สร้างข้อมูล |
| `updated_at` | timestamp | วันที่อัปเดตข้อมูล |

เหตุผลที่ใช้ `category_id` เป็น unique key:

- เป็นรหัสจาก source ที่ใช้เชื่อมกับ order item
- ทำให้ upsert ข้อมูล master data ได้ตรงรายการเดิม
- ใช้เป็น foreign key จาก `sub_categories` และ `order_items`

### 2. sub_categories

เก็บหมวดหมู่ย่อยของสินค้า โดยผูกกับ `categories.category_id`

| Column | Type | รายละเอียด |
| --- | --- | --- |
| `id` | UUID | primary key ภายในระบบ |
| `sub_category_id` | varchar(50) | รหัส subCategory จาก source ใช้เป็น unique key |
| `category_id` | varchar(50) | foreign key ไปที่ `categories.category_id` |
| `sub_category_name` | varchar(255) | ชื่อ subCategory |
| `created_at` | timestamp | วันที่สร้างข้อมูล |
| `updated_at` | timestamp | วันที่อัปเดตข้อมูล |

ประโยชน์ของการแยก `sub_categories`:

- แสดงรายการ SubCategory ตาม Category ที่เลือกได้ตรงตามโจทย์
- ลดการเก็บชื่อ subCategory ซ้ำใน order item
- ทำให้ข้อมูลสินค้ามีโครงสร้างชัดเจนและขยายต่อได้

### 3. orders

เก็บข้อมูลระดับหัว order ทั้งฝั่งซื้อและฝั่งขาย

| Column | Type | รายละเอียด |
| --- | --- | --- |
| `id` | UUID | primary key ภายในระบบ |
| `order_id` | varchar(100) | หมายเลข order จาก source ใช้เป็น unique key |
| `order_finished_date` | date | วันที่ order เสร็จ ใช้สำหรับ filter ช่วงวัน |
| `transaction_type` | varchar(10) | ประเภท transaction: `BUY` หรือ `SELL` |
| `created_at` | timestamp | วันที่สร้างข้อมูล |
| `updated_at` | timestamp | วันที่อัปเดตข้อมูล |

ข้อมูลซื้อและขายถูกเก็บในตารางเดียวกัน เพราะโครงสร้างข้อมูลเหมือนกัน
และสามารถแยกด้วย `transaction_type` ตอนคำนวณ summary ได้ชัดเจน

ตัวอย่าง:

```text
buyTransaction  -> transaction_type = BUY
sellTransaction -> transaction_type = SELL
```

### 4. order_items

เก็บรายการสินค้าในแต่ละ order และเป็นแหล่งข้อมูลหลักสำหรับคำนวณรายงาน

| Column | Type | รายละเอียด |
| --- | --- | --- |
| `id` | UUID | primary key ภายในระบบ |
| `order_id` | varchar(100) | foreign key ไปที่ `orders.order_id` |
| `category_id` | varchar(50) | foreign key ไปที่ `categories.category_id` |
| `sub_category_id` | varchar(50) | foreign key ไปที่ `sub_categories.sub_category_id` |
| `grade` | varchar(1) | เกรดสินค้า `A`, `B`, `C`, หรือ `D` |
| `quantity_kg` | decimal(14,2) | น้ำหนักสินค้า หน่วยกิโลกรัม |
| `price_per_kg` | decimal(14,2) | ราคาต่อกิโลกรัม |
| `total_amount` | decimal(14,2) | มูลค่ารวมของ item |
| `created_at` | timestamp | วันที่สร้างข้อมูล |
| `updated_at` | timestamp | วันที่อัปเดตข้อมูล |

เหตุผลที่เก็บ `category_id` และ `sub_category_id` ใน `order_items`:

- summary ต้อง group ตาม Category/SubCategory
- filter ตาม category/subCategory เกิดขึ้นที่ระดับ item
- order หนึ่งรายการสามารถมีสินค้าหลายประเภทได้
- ลดความซับซ้อนของ query ตอน aggregate รายงาน

## ความสัมพันธ์และ Foreign Key

| From | To | ความหมาย |
| --- | --- | --- |
| `sub_categories.category_id` | `categories.category_id` | subCategory อยู่ภายใต้ category |
| `order_items.order_id` | `orders.order_id` | item อยู่ใน order |
| `order_items.category_id` | `categories.category_id` | item เป็นสินค้าใน category ใด |
| `order_items.sub_category_id` | `sub_categories.sub_category_id` | item เป็นสินค้าใน subCategory ใด |

แนวทาง on delete:

- ถ้าลบ order จะลบ order items ของ order นั้นตามไปด้วย
- ไม่อนุญาตให้ลบ category/subCategory ที่ยังถูกอ้างอิงโดย order item

## Index ที่ใช้

เพิ่ม index ตาม field ที่ใช้ filter, join และ aggregate บ่อย

| Index | Field | ใช้กับงาน |
| --- | --- | --- |
| `idx_sub_categories_category_id` | `sub_categories.category_id` | โหลด SubCategory ตาม Category |
| `idx_orders_finished_date` | `orders.order_finished_date` | filter ช่วงวันที่ |
| `idx_orders_transaction_type` | `orders.transaction_type` | แยก BUY/SELL |
| `idx_orders_order_id` | `orders.order_id` | ค้นหา order และ join |
| `idx_order_items_category_id` | `order_items.category_id` | filter category |
| `idx_order_items_sub_category_id` | `order_items.sub_category_id` | filter subCategory |
| `idx_order_items_grade` | `order_items.grade` | filter grade |
| `idx_order_items_price_per_kg` | `order_items.price_per_kg` | filter ช่วงราคา |
| `idx_order_items_summary_filters` | `category_id, sub_category_id, grade, price_per_kg` | ช่วย query summary ที่ใช้หลาย filter ร่วมกัน |

## ลำดับการ import ข้อมูล

ต้อง import product master data ก่อน order:

```text
1. products -> categories, sub_categories
2. orders   -> orders, order_items
```

เหตุผลคือ `order_items` มี foreign key ไปยัง `categories` และ `sub_categories`
ถ้า import order ก่อน master data จะทำให้ข้อมูลอ้างอิงไม่ครบ

ใน service จึงมีการตรวจ master data ก่อนบันทึก order ถ้าพบ category/subCategory ที่ยังไม่มี
ระบบจะตอบ error กลับไปพร้อมรายการ id ที่ขาด

## การ normalize ข้อมูลจาก source

ข้อมูลจาก source มีโครงสร้างซ้อนกันหลายชั้น จึงต้องแปลงเป็น relational rows ก่อนบันทึก

### Product source

```text
productList[]
  -> category
    -> subcategory[]
```

แปลงเป็น:

```text
categories
sub_categories
```

### Order source

```text
buyTransaction[] / sellTransaction[]
  -> order
    -> requestList[]          กลุ่มสินค้า
      -> requestList[]        รายการแยก grade
```

แปลงเป็น:

```text
orders
order_items
```

ระบบเก็บเฉพาะ grade ที่รองรับคือ `A`, `B`, `C`, `D`

กรณี source ส่ง `total` เป็น 0:

```text
total_amount = quantity * price
```

เพื่อให้รายงานยังคำนวณยอดรวมได้

## การคำนวณ summary

Summary API query จาก `order_items` แล้ว join ไปที่ตารางอื่น:

```text
order_items
  -> orders
  -> categories
  -> sub_categories
```

การคำนวณหลัก:

| ข้อมูล | วิธีคำนวณ |
| --- | --- |
| ซื้อรวม | sum `quantity_kg` เฉพาะ `transaction_type = BUY` |
| ยอดซื้อรวม | sum `total_amount` เฉพาะ `transaction_type = BUY` |
| ขายรวม | sum `quantity_kg` เฉพาะ `transaction_type = SELL` |
| ยอดขายรวม | sum `total_amount` เฉพาะ `transaction_type = SELL` |
| คงเหลือ กก. | ซื้อรวม - ขายรวม |
| คงเหลือ บาท | ยอดซื้อรวม - ยอดขายรวม |
| แยก grade | group by `grade` และ `transaction_type` |
| ช่วงราคา | min/max `price_per_kg` โดยไม่นับ 0 เป็นราคาต่ำสุด |

ตัวอย่างการคิดคงเหลือ:

```text
remaining_quantity_kg = buy_quantity_kg - sell_quantity_kg
remaining_amount      = buy_total_amount - sell_total_amount
```

## การทำงานของ filter ในรายงาน

| Filter | ใช้ field |
| --- | --- |
| วันที่ | `orders.order_finished_date` |
| Category | `order_items.category_id` |
| SubCategory | `order_items.sub_category_id` |
| OrderId | `orders.order_id` |
| ช่วงราคา | `order_items.price_per_kg` |
| Grade | `order_items.grade` |

สำคัญ: grade filter ถูก apply ก่อน aggregate
ดังนั้นเมื่อเลือก `grade=A` ระบบจะคำนวณยอดรวมจาก item grade A เท่านั้น

## ทำไมไม่สร้าง summary table แยก

สำหรับขอบเขตของ assignment นี้ ระบบคำนวณ summary จาก `order_items` โดยตรง เพราะ:

```text
1. ลดการเก็บข้อมูลซ้ำ
2. ข้อมูล summary เปลี่ยนตาม filter ได้หลายแบบ
3. ไม่ต้องดูแลการ sync ระหว่าง raw data กับ summary table
4. ข้อมูลต้นทางมีขนาดเหมาะกับการ aggregate แบบ query-time
5. โครงสร้างยังต่อยอดเป็น materialized view หรือ summary table ได้ในอนาคต
```

ถ้าระบบนี้ต้องรองรับข้อมูลจำนวนมากใน production สามารถเพิ่ม materialized view หรือ scheduled summary table ได้ภายหลัง
โดยยังใช้ schema ตั้งต้นชุดเดิมเป็น source of truth

## ไฟล์ที่เกี่ยวข้อง

```text
prisma/schema.prisma
prisma/migrations/
src/imports/imports.service.ts
src/summaries/summaries.repository.ts
src/summaries/summaries.mapper.ts
```
