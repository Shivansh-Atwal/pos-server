# SmartBill POS Backend API

Complete backend server for SmartBill POS with Gemini AI integration.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure .env
cp .env.example .env
# Add your Gemini API key to .env

# 3. Run server
npm start         # Production
npm run dev       # Development with hot-reload
```

Server runs on `http://localhost:5000`

---

## 📋 Features

✅ **Product Management**
- CRUD operations
- Search & filter
- Stock management
- Category organization

✅ **Gemini AI Integration**
- Image analysis for product recognition
- Auto-extract: name, price, category, brand
- Confidence level assessment
- Receipt/bill image parsing

✅ **Bill Management**
- Create & store bills
- Calculate totals with tax
- Support discounts
- Payment method tracking
- Daily statistics

✅ **Inventory System**
- Track stock levels
- Alert for low stock
- Reorder management
- History tracking

✅ **Security**
- Password hashing
- JWT auth ready
- CORS protection
- Input validation

---

## 🔌 API Endpoints

### Products
```
GET    /api/products                    Get all products
POST   /api/products/analyze            Analyze image with Gemini
GET    /api/products/:id                Get product details
POST   /api/products                    Create product
PUT    /api/products/:id                Update product
DELETE /api/products/:id                Delete product
```

### Bills
```
POST   /api/bills                       Create bill
GET    /api/bills                       Get all bills
GET    /api/bills/:id                   Get bill details
GET    /api/bills/stats/daily           Get daily stats
```

### Inventory
```
GET    /api/inventory                   Get inventory
GET    /api/inventory/low-stock         Get low stock items
POST   /api/inventory                   Add inventory
PUT    /api/inventory/:id               Update inventory
```

---

## 🛠️ Setup Options

### Local MongoDB
```bash
# Install MongoDB
# https://docs.mongodb.com/manual/installation/

# Start MongoDB
mongod

# .env
MONGODB_URI=mongodb://localhost:27017/smartbill-pos
```

### MongoDB Atlas Cloud
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smartbill-pos
```

### Demo Mode (No DB)
- Server runs without database
- Perfect for testing API
- Data not persisted

---

## 📁 Structure

```
server-side/
├── server.js           ← Main entry
├── package.json        ← Dependencies
├── .env               ← Configuration
│
├── routes/            ← API endpoints
│   ├── products.js
│   ├── bills.js
│   └── inventory.js
│
├── models/            ← Database schemas
│   ├── Product.js
│   ├── Bill.js
│   ├── User.js
│   └── Inventory.js
│
└── services/          ← Business logic
    └── geminiService.js
```

---

## 🤖 Gemini AI Features

### Image Analysis
```
POST /api/products/analyze
{
  "imageData": "base64_encoded_image"
}
```

Extracts:
- Product name
- Price estimate
- Category
- Brand
- Confidence level

### Supported Methods
- `analyzeProductImage()` - Product recognition
- `generateProductDescription()` - Auto descriptions
- `analyzeBillImage()` - Receipt parsing

---

## 📝 Example Usage

### Create Product
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lays",
    "price": 20,
    "category": "Snacks"
  }'
```

### Analyze Image
```bash
curl -X POST http://localhost:5000/api/products/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageData": "base64_image..."}'
```

### Create Bill
```bash
curl -X POST http://localhost:5000/api/bills \
  -H "Content-Type: application/json" \
  -d '{
    "items": [...],
    "total": 100,
    "paymentMethod": "Cash"
  }'
```

---

## 📦 Dependencies

- **express** - Web server
- **mongoose** - MongoDB driver
- **@google/generative-ai** - Gemini API
- **cors** - Cross-origin support
- **dotenv** - Environment config
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT auth
- **multer** - File uploads

---

## 🔐 Security

- ✅ Environment variables for secrets
- ✅ Password hashing (bcryptjs)
- ✅ CORS configured
- ✅ Input validation
- ✅ Error handling
- ✅ JWT ready

---

## 🚀 Deployment

### Heroku
```bash
heroku create smartbill-pos-api
git push heroku main
```

### AWS
```bash
# Use Elastic Beanstalk or EC2
eb init
eb create
```

### DigitalOcean
```bash
# Deploy as app
# Set environment variables in dashboard
```

---

## 📚 Documentation

See [BACKEND_SETUP.md](BACKEND_SETUP.md) for:
- Detailed setup
- API reference
- Data schemas
- Example requests
- Troubleshooting

---

## 🔗 Connect with Frontend

Frontend repository should:
```javascript
const API_URL = 'http://localhost:5000'

// Use API endpoints
fetch(`${API_URL}/api/products`)
fetch(`${API_URL}/api/products/analyze`, {
  method: 'POST',
  body: JSON.stringify({imageData})
})
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5000 in use | Change PORT in .env |
| MongoDB not found | Install MongoDB or use Atlas |
| Gemini error | Add API key to .env |
| CORS error | Check CORS_ORIGIN |

---

## 📊 Status

✅ Development ready
✅ API functional
✅ Gemini integration working
✅ Database models created
✅ Routes configured
✅ Error handling included

---

## 📈 Next Steps

1. Add authentication
2. Implement file uploads
3. Add bill PDF export
4. Setup caching
5. Add rate limiting
6. Deploy to cloud

---

**Version**: 1.0.0
**Updated**: January 21, 2026
**Status**: ✅ Ready for development
