# เอกสารออกแบบฐานข้อมูล

ระบบนี้ใช้ PostgreSQL เพราะข้อมูลจากโจทย์มี relationship ชัดเจน และต้อง query แบบ join/aggregate หลายเงื่อนไขพร้อมกัน
เช่น filter ตามวันที่, category, subCategory, grade, ราคา และ orderId

โครงสร้างข้อมูลถูกแยกออกเป็น master data และ transaction data:

```text
Master data      -> categories, sub_categories
Transaction data -> orders, order_items
```

แนวทางนี้ทำให้ข้อมูลสินค้าไม่ซ้ำในทุก order และทำให้ summary query อ้างอิงชื่อสินค้าได้จาก master data โดยตรง

## ERD แบบย่อ

```text
categories     1 -> many sub_categories
categories     1 -> many order_items
sub_categories 1 -> many order_items
orders         1 -> many order_items
```

## ตารางหลัก

### categories

เก็บหมวดหมู่หลักของสินค้า เช่น พลาสติก, โลหะ, กระดาษ

| Column | รายละเอียด |
| --- | --- |
| `id` | UUID ภายในระบบ |
| `category_id` | รหัส category จาก source ใช้เป็น unique key |
| `category_name` | ชื่อ category |
| `created_at` | วันที่สร้างข้อมูล |
| `updated_at` | วันที่อัปเดตข้อมูล |

### sub_categories

เก็บหมวดหมู่ย่อยของสินค้า โดยผูกกับ `categories.category_id`

| Column | รายละเอียด |
| --- | --- |
| `id` | UUID ภายในระบบ |
| `sub_category_id` | รหัส subCategory จาก source ใช้เป็น unique key |
| `category_id` | อ้างอิง `categories.category_id` |
| `sub_category_name` | ชื่อ subCategory |
| `created_at` | วันที่สร้างข้อมูล |
| `updated_at` | วันที่อัปเดตข้อมูล |

การแยก `sub_categories` ออกจาก `categories` ช่วยให้ frontend จำกัดตัวเลือก SubCategory ตาม Category ที่เลือกได้ง่าย

### orders

เก็บข้อมูลระดับหัว order

| Column | รายละเอียด |
| --- | --- |
| `id` | UUID ภายในระบบ |
| `order_id` | หมายเลข order จาก source ใช้เป็น unique key |
| `order_finished_date` | วันที่ order เสร็จ ใช้สำหรับ date range filter |
| `transaction_type` | `BUY` หรือ `SELL` |
| `created_at` | วันที่สร้างข้อมูล |
| `updated_at` | วันที่อัปเดตข้อมูล |

ข้อมูลซื้อและขายถูกเก็บในตารางเดียวกัน แล้วแยกด้วย `transaction_type`
เพราะโครงสร้าง order สองฝั่งเหมือนกัน และช่วยให้ summary query รวม/ลบยอดซื้อขายได้ตรงไปตรงมา

### order_items

เก็บรายการสินค้าใน order และเป็นตารางหลักสำหรับคำนวณรายงาน

| Column | รายละเอียด |
| --- | --- |
| `id` | UUID ภายในระบบ |
| `order_id` | อ้างอิง `orders.order_id` |
| `category_id` | อ้างอิง `categories.category_id` |
| `sub_category_id` | อ้างอิง `sub_categories.sub_category_id` |
| `grade` | เกรดสินค้า `A`, `B`, `C`, หรือ `D` |
| `quantity_kg` | น้ำหนัก หน่วยกิโลกรัม |
| `price_per_kg` | ราคาต่อกิโลกรัม |
| `total_amount` | มูลค่ารวมของ item |
| `created_at` | วันที่สร้างข้อมูล |
| `updated_at` | วันที่อัปเดตข้อมูล |

สาเหตุที่เก็บ `category_id` และ `sub_category_id` ไว้ใน `order_items` ด้วย
เพราะข้อมูล summary ต้อง group ตามสินค้า และต้อง filter ตาม category/subCategory โดยตรง

## Index ที่ใช้

เพิ่ม index ตาม field ที่ใช้ filter และ join บ่อย:

| Index | ใช้กับงาน |
| --- | --- |
| `idx_sub_categories_category_id` | โหลด subCategory ตาม category |
| `idx_orders_finished_date` | filter ช่วงวันที่ |
| `idx_orders_transaction_type` | แยก BUY/SELL |
| `idx_orders_order_id` | ค้นหา order และ join |
| `idx_order_items_category_id` | filter category |
| `idx_order_items_sub_category_id` | filter subCategory |
| `idx_order_items_grade` | filter grade |
| `idx_order_items_price_per_kg` | filter ช่วงราคา |
| `idx_order_items_summary_filters` | ช่วย query summary ที่ใช้หลาย filter ร่วมกัน |

## ลำดับการ import

ต้อง import product master data ก่อน order:

```text
1. products -> categories, sub_categories
2. orders   -> orders, order_items
```

เหตุผลคือ `order_items` มี foreign key ไปยัง `categories` และ `sub_categories`
ถ้า import order ก่อน master data จะทำให้ข้อมูลอ้างอิงไม่ครบ

ใน service จึงมีการตรวจ master data ก่อนบันทึก order ถ้าพบ category/subCategory ที่ยังไม่มี ระบบจะตอบ error กลับไป

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

## ทำไมไม่สร้าง summary table แยก

สำหรับขอบเขตของ assignment นี้ ระบบคำนวณ summary จาก `order_items` โดยตรง เพราะ:

```text
1. ลดการเก็บข้อมูลซ้ำ
2. ข้อมูล summary เปลี่ยนตาม filter ได้หลายแบบ
3. ไม่ต้องดูแลการ sync ระหว่าง raw data กับ summary table
4. โครงสร้างยังต่อยอดเป็น materialized view หรือ summary table ได้ในอนาคต
```

ถ้าระบบนี้ต้องรองรับข้อมูลจำนวนมากใน production สามารถเพิ่ม materialized view หรือ scheduled summary table ภายหลังได้
โดยไม่ต้องเปลี่ยนโครงสร้างข้อมูลตั้งต้นมากนัก
