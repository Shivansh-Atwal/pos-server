import axios from 'axios'

/**
 * WhatsApp Business API Service
 * Handles sending messages via WhatsApp Business Account
 */

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.instagram.com/v18.0'
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

/**
 * Send bill as PDF via WhatsApp
 * @param {string} recipientPhoneNumber - Customer's phone number with country code (e.g., +919876543210)
 * @param {string} pdfBase64} - PDF file as base64 string
 * @param {string} fileName - Name of the PDF file
 * @returns {Promise} API response
 */
export const sendBillViaWhatsApp = async (recipientPhoneNumber, pdfBase64, fileName = 'bill.pdf') => {
  try {
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      throw new Error('WhatsApp configuration not set. Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN environment variables.')
    }

    // Format phone number
    const formattedPhone = recipientPhoneNumber.replace(/[^0-9+]/g, '')

    // Upload media first
    const uploadResponse = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/media`,
      {
        messaging_product: 'whatsapp',
        file: pdfBase64,
        type: 'application/pdf',
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    const mediaId = uploadResponse.data.id

    // Send message with document
    const messageResponse = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'document',
        document: {
          id: mediaId,
          filename: fileName,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return {
      success: true,
      messageId: messageResponse.data.messages[0].id,
      message: `Bill sent successfully to ${recipientPhoneNumber}`,
    }
  } catch (error) {
    console.error('WhatsApp send error:', error.response?.data || error.message)
    throw new Error(`Failed to send bill via WhatsApp: ${error.message}`)
  }
}

/**
 * Send simple text message via WhatsApp
 * @param {string} recipientPhoneNumber - Customer's phone number
 * @param {string} message - Text message to send
 * @returns {Promise} API response
 */
export const sendTextMessage = async (recipientPhoneNumber, message) => {
  try {
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      throw new Error('WhatsApp configuration not set.')
    }

    const formattedPhone = recipientPhoneNumber.replace(/[^0-9+]/g, '')

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return {
      success: true,
      messageId: response.data.messages[0].id,
      message: `Message sent successfully to ${recipientPhoneNumber}`,
    }
  } catch (error) {
    console.error('WhatsApp send error:', error.response?.data || error.message)
    throw new Error(`Failed to send message via WhatsApp: ${error.message}`)
  }
}

export default { sendBillViaWhatsApp, sendTextMessage }
