import { generateQR } from './util'
import { PDFDocument, PageSizes, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import imageUrlRF from '../RF.png'
import imageUrlTAC from '../TAC.png'
import LucioleFontBase from '../Luciole-Regular.ttf'
import LucioleBoldFontBase from '../Luciole-Bold.ttf'
import LucioleItalicFontBase from '../Luciole-Regular-Italic.ttf'
import LucioleBoldItalicFontBase from '../Luciole-Bold-Italic.ttf'
import curfewPdfData from '../curfew-pdf-data.json'
import quarantinePdfData from '../quarantine-pdf-data.json'

// const pdfWidth = 595.28
// const pdfHeight = 841.89
// const milimeterWidth = 210
// const milimeterHeight = 297
// const pixelWidth = 892
// const milimeterRatio = 0.35277516462841
const pixelRatio = 1.49845450880258
const sizeRatio = 0.66
export async function generatePdf (profile, reasons, context) {
  let pdfData = curfewPdfData
  if (context === 'quarantine') {
    pdfData = quarantinePdfData
  }
  const creationInstant = new Date()
  const creationDate = creationInstant.toLocaleDateString('fr-FR')
  const creationHour = creationInstant
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', 'h')

  const {
    lastname,
    firstname,
    birthday,
    address,
    zipcode,
    city,
    datesortie,
    heuresortie,
  } = profile

  const data = [
    `Cree le: ${creationDate} a ${creationHour}`,
    `Nom: ${lastname}`,
    `Prenom: ${firstname}`,
    `Naissance: ${birthday}`,
    `Adresse: ${address} ${zipcode} ${city}`,
    `Sortie: ${datesortie} a ${heuresortie}`,
    `Motifs: ${reasons}`,
    '', // Pour ajouter un ; aussi au dernier élément
  ].join(';\n')

  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)
  const page = pdfDoc.addPage(PageSizes.A4)
  const height = page.getSize().height

  // set pdf metadata
  pdfDoc.setTitle('COVID-19 - Déclaration de déplacement')
  pdfDoc.setSubject('Attestation de déplacement dérogatoire')
  pdfDoc.setKeywords([
    'covid19',
    'covid-19',
    'attestation',
    'déclaration',
    'déplacement',
    'officielle',
    'gouvernement',
  ])
  pdfDoc.setProducer('DNUM/SDIT')
  pdfDoc.setCreator('')
  pdfDoc.setAuthor("Ministère de l'intérieur")

  let imageBuffer = await fetch(imageUrlRF).then(res => res.arrayBuffer())
  const imageRF = await pdfDoc.embedPng(imageBuffer)
  imageBuffer = await fetch(imageUrlTAC).then(res => res.arrayBuffer())
  const imageTAC = await pdfDoc.embedPng(imageBuffer)

  let fontBuffer = await fetch(LucioleFontBase).then(res => res.arrayBuffer())
  const fontLuciole = await pdfDoc.embedFont(fontBuffer)
  fontBuffer = await fetch(LucioleBoldFontBase).then(res => res.arrayBuffer())
  const fontLucioleBold = await pdfDoc.embedFont(fontBuffer)
  fontBuffer = await fetch(LucioleItalicFontBase).then(res => res.arrayBuffer())
  const fontLucioleItalic = await pdfDoc.embedFont(fontBuffer)
  fontBuffer = await fetch(LucioleBoldItalicFontBase).then(res => res.arrayBuffer())
  const fontLucioleBoldItalic = await pdfDoc.embedFont(fontBuffer)

  let x = 0
  let size = 0
  let block = 0
  let sameline = false
  let font = fontLuciole

  page.drawImage(imageRF, { x: 30, y: page.getHeight() - 80, width: 56, height: 50 })
  page.drawImage(imageTAC, { x: page.getWidth() - 66, y: page.getHeight() - 80, width: 33, height: 50 })

  let y = height - 75

  pdfData.forEach(item => {
    x = 0
    size = Number((item.size * sizeRatio).toFixed(2)) || 10
    block = (item.block === undefined ? 1 : item.block) // Pas de bloc défini dans le JSON = cofficient interligne 1 = standard
    sameline = (item.sameline === undefined ? false : item.sameline) // Pas de flag défini dans le JSON = on passe à la ligne suivante avant d'écrire (fonctionnement standard)

    switch (item.font) {
      case 'LucioleBold':
        font = fontLucioleBold
        break
      case 'LucioleItalic':
        font = fontLucioleItalic
        break
      case 'LucioleBoldItalic':
        font = fontLucioleBoldItalic
        break
      default:
        font = fontLuciole
    }

    if (item.top) {
      x = item.left / pixelRatio
    }
    const label = item.label || ''
    let text = item.variablesNames ? item.variablesNames.reduce((acc, name) => acc + ' ' + profile[name], label) : label
    const isSelectedReason = reasons.split(', ').includes(item.reason)
    const checkbox = isSelectedReason ? '[x]' : '[ ]'

    if (item.type === 'checkbox') {
      y = y - (block * size)
      const xc = x - 16
      page.drawText(checkbox, { x: xc, y, size, font })
      page.drawText(label, { x, y, size, font })
    }
    if (item.type === 'text') {
      if (!sameline) {
        y = y - (block * size) - 5
      }
      page.drawText(text, { x, y, size, font })
    }
    if (item.type === 'input') {
      if (!sameline) {
        y = y - (block * size) - 5
      }
      text = item.inputs.reduce((acc, cur) => acc + ' ' + profile[cur], text)
      page.drawText(text, { x, y, size, font })
    }
  })

  const qrTitle1 = 'QR-code contenant les informations '
  const qrTitle2 = 'de votre attestation numérique'

  const generatedQR = await generateQR(data)

  const qrImage = await pdfDoc.embedPng(generatedQR)
  const pageX0 = pdfDoc.getPages()[0]
  pageX0.drawText(qrTitle1 + '\n' + qrTitle2, { x: 470, y, size: 6, font, lineHeight: 10, color: rgb(1, 1, 1) })

  pageX0.drawImage(qrImage, {
    x: pageX0.getWidth() - 107,
    y: y - 105,
    width: 82,
    height: 82,
  })

  pdfDoc.addPage()
  const pageX = pdfDoc.getPages()[1]
  pageX.drawText(qrTitle1 + qrTitle2, { x: 50, y: pageX.getHeight() - 70, size: 11, font, color: rgb(1, 1, 1) })
  pageX.drawImage(qrImage, {
    x: 50,
    y: pageX.getHeight() - 390,
    width: 300,
    height: 300,
  })

  const pdfBytes = await pdfDoc.save()

  return new Blob([pdfBytes], { type: 'application/pdf' })
}
