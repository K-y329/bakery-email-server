import express from "express"
import cors from "cors"
import { Resend } from "resend"

const app = express()
const port = process.env.PORT || 5000

// 🔥 Middleware
app.use(cors({
  origin: "https://bakio-bakery.web.app",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}))
app.options("*", cors())
app.use(express.json())

// 🔑 Put your Resend API key here
const resend = new Resend("re_4i2gRgxZ_3uttdGCZ8XJQtsfbXQJjXgb1")

// 🎂 Format custom cake (same logic as frontend)
function formatCustomCake(custom) {
  if (!custom) return ""

  let text = `\n🎂 CUSTOM CAKE DETAILS\n`
  text += `Size: ${custom.size}\n\n`

  custom.layers.forEach((layer, i) => {
    text += `Layer ${i + 1}:\n`
    text += `- Flavor: ${layer.flavor}\n`
    text += `- Filling: ${layer.filling}\n`
    text += `- Frosting: ${layer.frosting}\n\n`
  })

  if (custom.toppings?.length) {
    text += `Toppings: ${custom.toppings.join(", ")}\n\n`
  }

  if (custom.message) {
    text += `Message: "${custom.message}"\n\n`
  }

  text += `------------------------\n`

  return text
}

// 📩 MAIN EMAIL ROUTE
app.post("/send-email", async (req, res) => {
  const { order, delivery } = req.body

  try {
    const itemsText = order.items
      .map(i => {
        let base = `
${i.name} x${i.quantity}
Price: AED ${i.price * i.quantity}
`

        if (i.custom) {
          base += formatCustomCake(i.custom)
        }

        if (i.substituteNote) {
          base += `Substitutes: ${i.substituteNote}\n`
        }

        base += "------------------------\n"
        return base
      })
      .join("\n")

    await resend.emails.send({
      from: "Bakio <onboarding@resend.dev>",
      to: delivery.email, // 🔥 send to customer
      subject: `🧁 Order #${order.id} Confirmation`,
      text: `
Order ID: ${order.id}

Name: ${delivery.name}
Phone: ${delivery.phone}
Address: ${delivery.address}

------------------------

${itemsText}

TOTAL: AED ${order.total}
`
    })

    // 🔥 ALSO SEND TO BAKERY (YOU)
    await resend.emails.send({
      from: "Bakio <onboarding@resend.dev>",
      to: "bakio.orders@gmail.com",
      subject: `🆕 NEW ORDER #${order.id}`,
      text: `
New order received!

${itemsText}

Customer:
${delivery.name}
${delivery.phone}
${delivery.address}

TOTAL: AED ${order.total}
`
    })

    res.json({ success: true })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Email failed" })
  }
})

// 🚀 Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

app.get("/healthz", (req, res) => {
  res.send("OK")
})