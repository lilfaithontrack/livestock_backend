# Database Seeder

## Overview
This script populates your database with sample data for testing and development.

## What Gets Created

### Users (4)
- **Admin**: Phone `0911111111`, Password `password123`
- **Seller 1**: Phone `0922222222`, Password `password123`
- **Seller 2**: Phone `0933333333`, Password `password123`
- **Buyer**: Phone `0944444444`, Password `password123`

### Currencies (2)
- Ethiopian Birr (ETB)
- US Dollar (USD)

### Categories & Subcategories (4 categories, 7 subcategories)
1. **Livestock**
   - Cattle
   - Sheep & Goats

2. **Electronics**
   - Mobile Phones
   - Laptops

3. **Clothing**
   - Men's Wear

4. **Food & Beverages**
   - Honey & Natural Products

### Products (6)
1. **Premium Holstein Dairy Cow** (Livestock) - 85,000 ETB
2. **Boer Goat** (Livestock) - 15,000 ETB
3. **Samsung Galaxy S24 Ultra** (Electronics) - 125,000 ETB
4. **MacBook Pro 16" M3 Max** (Electronics) - 285,000 ETB
5. **Men's Premium Cotton T-Shirt** (Clothing) - 800 ETB
6. **Organic Ethiopian White Honey** (Food) - 1,200 ETB

### Qercha Packages (2)
1. **Premium Holstein Cow - Group Purchase** (10 shares @ 8,500 ETB each)
2. **Boer Goat Group Purchase** (5 shares @ 3,000 ETB each)

## How to Run

### Option 1: Direct Execution
```bash
cd c:\Users\kalu4\Videos\livestock\backend
node seed-data.js
```

### Option 2: Add to package.json
Add this to your `package.json` scripts:
```json
{
  "scripts": {
    "seed": "node seed-data.js"
  }
}
```

Then run:
```bash
npm run seed
```

## Important Notes

⚠️ **Warning**: This script will add data to your database. Make sure you're running it on a development database, not production!

✅ **Safe to Re-run**: You can run this multiple times. It will create new records each time (different UUIDs).

🔄 **Transaction Support**: Uses database transactions, so if anything fails, nothing gets inserted.

## After Seeding

You can now:
1. **Login** to the admin panel or app with the credentials above
2. **Browse products** through the API
3. **Test orders** with the buyer account
4. **Manage inventory** with seller accounts
5. **Join Qercha** packages with the buyer account

## Verify Data

Check if data was inserted:
```sql
-- Check categories
SELECT * FROM product_categories;

-- Check products
SELECT product_id, name, product_type, price, stock_quantity FROM products;

-- Check qercha packages
SELECT * FROM qercha_packages;

-- Check users
SELECT user_id, phone, email, role FROM users;
```

## Clean Up (Optional)

To remove all seeded data, you can truncate tables (⚠️ **BE CAREFUL**):
```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE qercha_packages;
TRUNCATE TABLE products;
TRUNCATE TABLE product_subcategories;
TRUNCATE TABLE product_categories;
TRUNCATE TABLE users;
TRUNCATE TABLE currencies;
SET FOREIGN_KEY_CHECKS = 1;
```
