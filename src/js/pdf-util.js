import { generateQR } from './util'
import { PDFDocument, PageSizes, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
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
const pixelHeight = 1262
// const milimeterRatio = 0.35277516462841
const pixelRatio = 1.49845450880258
const sizeRatio = 0.66
let pdfData = curfewPdfData
export async function generatePdf (profile, reasons, context) {
  if (context === 'quarantine') {
    pdfData = quarantinePdfData
  } else {
    pdfData = curfewPdfData
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
  pdfDoc.addPage(PageSizes.A4)

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

  let fontBuffer = await fetch(LucioleFontBase).then(res => res.arrayBuffer())
  const fontLuciole = await pdfDoc.embedFont(fontBuffer)
  fontBuffer = await fetch(LucioleBoldFontBase).then(res => res.arrayBuffer())
  const fontLucioleBold = await pdfDoc.embedFont(fontBuffer)
  fontBuffer = await fetch(LucioleItalicFontBase).then(res => res.arrayBuffer())
  const fontLucioleItalic = await pdfDoc.embedFont(fontBuffer)
  fontBuffer = await fetch(LucioleBoldItalicFontBase).then(res => res.arrayBuffer())
  const fontLucioleBoldItalic = await pdfDoc.embedFont(fontBuffer)

  let pages = pdfDoc.getPages()
  let pageIdx = 0
  let page = pages[0]
  let x = 0
  let y = 0
  let size = 0
  let font = fontLuciole

  pdfData.forEach(item => {
    const itemPageIdx = item.page - 1 || 0
    if (itemPageIdx !== pageIdx) {
      if (item.page > pages.length) {
        pdfDoc.addPage(PageSizes.A4)
        pages = pdfDoc.getPages()
      }
      pageIdx = itemPageIdx
      page = pages[pageIdx]
    }
    x = 0
    y = 0
    size = Number((item.size * sizeRatio).toFixed(2)) || 10
    font = item.font === 'LucioleBold'
      ? fontLucioleBold
      : item.font === 'LucioleItalic'
        ? fontLucioleItalic
        : item.font === 'LucioleBoldItalic'
          ? fontLucioleBoldItalic
          : fontLuciole

    if (item.top) {
      x = item.left / pixelRatio
      y = (pixelHeight - item.top) / pixelRatio
    } else {
      x = item.x
      y = item.y
    }
    const label = item.label || ''
    let text = item.variablesNames ? item.variablesNames.reduce((acc, name) => acc + ' ' + profile[name], label) : label
    if (item.type === 'text') {
      page.drawText(text, { x, y, size, font })
    }
    if (item.type === 'input') {
      text = item.inputs.reduce((acc, cur) => acc + ' ' + profile[cur], text)
      page.drawText(text, { x, y, size, font })
    }
    if (item.type === 'checkbox') {
      const xc = x - 16
      const checkbox = reasons.split(', ').includes(item.reason) ? '[x]' : '[ ]'
      page.drawText(checkbox, { x: xc, y, size, font })
      page.drawText(label, { x, y, size, font })
    }
  })

  const qrTitle1 = 'QR-code contenant les informations '
  const qrTitle2 = 'de votre attestation numérique'

  const generatedQR = await generateQR(data)

  const qrImage = await pdfDoc.embedPng(generatedQR)
  const pageX0 = pdfDoc.getPages()[0]
  pageX0.drawText(qrTitle1 + '\n' + qrTitle2, { x: 470, y: 121, size: 6, font, lineHeight: 10, color: rgb(1, 1, 1) })
  pageX0.drawImage(qrImage, {
    x: pageX0.getWidth() - 107,
    y: 21,
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
