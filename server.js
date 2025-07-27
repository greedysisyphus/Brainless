import express from 'express'
import fetch from 'node-fetch'
import cors from 'cors'
const app = express()

app.use(cors())

app.get('/api/forecast', async (req, res) => {
  try {
    const today = new Date()
    const year = today.getFullYear()
    const month = (today.getMonth() + 1).toString().padStart(2, '0')
    const day = today.getDate().toString().padStart(2, '0')
    
    const response = await fetch(
      `https://www.taoyuan-airport.com/uploads/fos/${year}_${month}_${day}.xls`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.taoyuan-airport.com'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error('下載預報表失敗')
    }
    
    const buffer = await response.buffer()
    
    res.set({
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/vnd.ms-excel'
    })
    
    res.send(buffer)
    
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
}) 