# Database Design

เอกสารนี้อธิบายการออกแบบฐานข้อมูลของระบบสรุปยอดซื้อ-ขายรายสินค้า
โดยอ้างอิงจากข้อมูลที่โจทย์ให้มา 2 ชุด:

```text
1. ข้อมูลสินค้า: Category / SubCategory
2. ข้อมูล order: Buy / Sell transaction
```

ข้อมูลลักษณะนี้เหมาะกับ relational database เพราะมีความสัมพันธ์ชัดเจนระหว่างหมวดหมู่สินค้า,
รายการสินค้าใน order และหัว order อีกทั้งรายงานต้องใช้การ join และ aggregate หลายเงื่อนไขพร้อมกัน
จึงเลือกใช้ PostgreSQL ร่วมกับ Prisma

## แนวคิดหลัก

ฐานข้อมูลถูกแบ่งเป็น 2 กลุ่มใหญ่:

```text
Master data
  - categories
  - sub_categories

Transaction data
  - orders
  - order_items
```

เหตุผลที่แยกแบบนี้คือข้อมูลสินค้าเป็นข้อมูลอ้างอิงที่ใช้ซ้ำหลาย order
ส่วน order และ order item เป็นข้อมูลความเคลื่อนไหวที่ใช้คำนวณยอดซื้อ-ขาย

ถ้าเก็บทุกอย่างรวมในตารางเดียว รายงานอาจทำได้เร็วในช่วงแรก แต่จะเกิดข้อมูลซ้ำจำนวนมาก
และแก้ไขชื่อ category/subCategory ยากกว่า การแยก master data ออกมาจึงเหมาะกับงานนี้มากกว่า

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

มุมมองในเชิงการใช้งาน:

```text
Category
  └── SubCategory
        └── OrderItem
              └── Order
```

`order_items` เป็นตารางที่สำคัญที่สุดสำหรับรายงาน เพราะแต่ละแถวมีข้อมูลครบทั้ง
category, subCategory, grade, quantity, price และ total amount

## Tables

### categories

เก็บหมวดหมู่หลักของสินค้า เช่น พลาสติก, โลหะ, กระดาษ

| Column | Type | รายละเอียด |
| --- | --- | --- |
| `id` | UUID | primary key ภายในระบบ |
| `category_id` | varchar(50) | รหัส category จาก source และใช้เป็น unique key |
| `category_name` | varchar(255) | ชื่อ category |
| `created_at` | timestamp | เวลาที่สร้างข้อมูล |
| `updated_at` | timestamp | เวลาที่แก้ไขข้อมูลล่าสุด |

`category_id` ถูกใช้เป็น unique key เพราะเป็นรหัสที่มากับ source และถูกอ้างอิงจากข้อมูล order
ทำให้สามารถ upsert master data ได้โดยไม่สร้างข้อมูลซ้ำ

### sub_categories

เก็บหมวดหมู่ย่อยของสินค้า และผูกกลับไปที่ `categories.category_id`

| Column | Type | รายละเอียด |
| --- | --- | --- |
| `id` | UUID | primary key ภายในระบบ |
| `sub_category_id` | varchar(50) | รหัส subCategory จาก source และใช้เป็น unique key |
| `category_id` | varchar(50) | foreign key ไปที่ `categories.category_id` |
| `sub_category_name` | varchar(255) | ชื่อ subCategory |
| `created_at` | timestamp | เวลาที่สร้างข้อมูล |
| `updated_at` | timestamp | เวลาที่แก้ไขข้อมูลล่าสุด |

การแยก `sub_categories` ออกมาเป็นตารางของตัวเองช่วยให้ frontend จำกัดตัวเลือก SubCategory
ตาม Category ที่เลือกได้ตรงตาม requirement

### orders

เก็บข้อมูลระดับหัว order ทั้งฝั่งซื้อและฝั่งขาย

| Column | Type | รายละเอียด |
| --- | --- | --- |
| `id` | UUID | primary key ภายในระบบ |
| `order_id` | varchar(100) | หมายเลข order จาก source และใช้เป็น unique key |
| `order_finished_date` | date | วันที่ order เสร็จ ใช้สำหรับ filter ช่วงวันที่ |
| `transaction_type` | varchar(10) | `BUY` หรือ `SELL` |
| `created_at` | timestamp | เวลาที่สร้างข้อมูล |
| `updated_at` | timestamp | เวลาที่แก้ไขข้อมูลล่าสุด |

ข้อมูลซื้อและขายถูกเก็บในตารางเดียวกัน แล้วแยกด้วย `transaction_type`
เพราะ source ทั้งสองฝั่งมีโครงสร้างใกล้เคียงกัน และการรวมไว้ที่เดียวทำให้ query summary ง่ายกว่า

```text
buyTransaction  -> BUY
sellTransaction -> SELL
```

### order_items

เก็บรายการสินค้าในแต่ละ order และเป็น source หลักในการคำนวณ summary

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
| `created_at` | timestamp | เวลาที่สร้างข้อมูล |
| `updated_at` | timestamp | เวลาที่แก้ไขข้อมูลล่าสุด |

ตารางนี้เก็บทั้ง `category_id` และ `sub_category_id` เพราะ requirement ของรายงานต้อง filter
และ group ตามสอง field นี้โดยตรง อีกทั้ง order หนึ่งรายการสามารถมีสินค้าหลายประเภทได้

## Relationships

| From | To | ความหมาย |
| --- | --- | --- |
| `sub_categories.category_id` | `categories.category_id` | subCategory อยู่ภายใต้ category |
| `order_items.order_id` | `orders.order_id` | item อยู่ภายใต้ order |
| `order_items.category_id` | `categories.category_id` | item อยู่ใน category ใด |
| `order_items.sub_category_id` | `sub_categories.sub_category_id` | item อยู่ใน subCategory ใด |

แนวทางการลบข้อมูล:

- ถ้าลบ order จะลบ order items ของ order นั้นตามไปด้วย
- ไม่อนุญาตให้ลบ category/subCategory ที่ยังถูก order item อ้างอิงอยู่

แนวทางนี้ช่วยรักษาความถูกต้องของข้อมูลและลดโอกาสเกิด orphan records

## Index Strategy

Index ถูกวางตาม field ที่ใช้ filter, join และ aggregate บ่อย

| Index | Field | ใช้กับงาน |
| --- | --- | --- |
| `idx_sub_categories_category_id` | `sub_categories.category_id` | โหลด SubCategory ตาม Category |
| `idx_orders_finished_date` | `orders.order_finished_date` | filter ช่วงวันที่ |
| `idx_orders_transaction_type` | `orders.transaction_type` | แยก BUY/SELL |
| `idx_orders_order_id` | `orders.order_id` | join และค้นหา order |
| `idx_order_items_category_id` | `order_items.category_id` | filter category |
| `idx_order_items_sub_category_id` | `order_items.sub_category_id` | filter subCategory |
| `idx_order_items_grade` | `order_items.grade` | filter grade |
| `idx_order_items_price_per_kg` | `order_items.price_per_kg` | filter ช่วงราคา |
| `idx_order_items_summary_filters` | `category_id, sub_category_id, grade, price_per_kg` | ช่วย query ที่ใช้หลาย filter พร้อมกัน |

ใน assignment นี้ข้อมูลไม่ได้ใหญ่มาก แต่การวาง index ตาม query pattern ช่วยให้ schema พร้อมต่อยอด
ถ้ามีข้อมูลเพิ่มในอนาคต

## Import Flow

ลำดับการ import สำคัญมาก:

```text
1. products -> categories, sub_categories
2. orders   -> orders, order_items
```

ต้อง import product master ก่อน เพราะ `order_items` มี foreign key ไปยัง `categories`
และ `sub_categories`

ถ้า import order ก่อน ระบบจะตรวจเจอว่า master data ยังไม่ครบและตอบ error กลับไป
พร้อมรายการ category/subCategory ที่ขาด เพื่อให้แก้ปัญหาได้ง่าย

## Normalization

ข้อมูล source เป็น nested JSON จึงต้อง normalize ก่อนบันทึกลง relational database

Product source:

```text
productList[]
  -> category
    -> subcategory[]
```

ถูกแปลงเป็น:

```text
categories
sub_categories
```

Order source:

```text
buyTransaction[] / sellTransaction[]
  -> order
    -> requestList[]       กลุ่มสินค้า
      -> requestList[]     รายการแยก grade
```

ถูกแปลงเป็น:

```text
orders
order_items
```

ระบบจะเก็บเฉพาะ grade ที่อยู่ในชุด `A`, `B`, `C`, `D`

ถ้า source ส่ง `total` เป็น `0` จะคำนวณมูลค่าใหม่จาก:

```text
total_amount = quantity * price
```

เพื่อให้ summary ยังแสดงยอดเงินได้ครบ

## Summary Calculation

Summary query อ่านจาก `order_items` แล้ว join ไปยัง `orders`, `categories` และ `sub_categories`

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

สูตรคงเหลือ:

```text
remaining_quantity_kg = buy_quantity_kg - sell_quantity_kg
remaining_amount      = buy_total_amount - sell_total_amount
```

## Filter Mapping

| Filter จาก API | Field ที่ใช้ |
| --- | --- |
| `startDate`, `endDate` | `orders.order_finished_date` |
| `categoryId` | `order_items.category_id` |
| `subCategoryId` | `order_items.sub_category_id` |
| `orderId` | `orders.order_id` |
| `minPrice`, `maxPrice` | `order_items.price_per_kg` |
| `grade` | `order_items.grade` |

Grade filter ถูก apply ก่อน aggregate ดังนั้นถ้าเลือก `grade=A`
ยอดซื้อรวม ยอดขายรวม และคงเหลือจะคำนวณจาก item grade A เท่านั้น

## ทำไมยังไม่แยก Summary Table

ระบบคำนวณ summary จาก `order_items` โดยตรง เพราะเหมาะกับขอบเขตของ assignment นี้มากกว่า

เหตุผล:

```text
1. ลดการเก็บข้อมูลซ้ำ
2. filter มีหลายรูปแบบและเปลี่ยนได้ตลอด
3. ไม่ต้องดูแล sync ระหว่าง raw data กับ summary table
4. raw data ยังเป็น source of truth ที่ตรวจสอบย้อนหลังได้
5. ถ้าข้อมูลใหญ่ขึ้น สามารถเพิ่ม materialized view หรือ scheduled summary table ได้ภายหลัง
```

## ไฟล์ที่เกี่ยวข้อง

```text
prisma/schema.prisma
prisma/migrations/
src/imports/imports.service.ts
src/summaries/summaries.repository.ts
src/summaries/summaries.mapper.ts
```
