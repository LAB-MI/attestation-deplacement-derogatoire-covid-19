import { generateQR } from './util'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const ys = {
  sport: {y: 381, page: 1},
  courses: {y: 269, page: 1},
  famille: {y: 214, page: 1},
  culte: {y: 160, page: 1},
  demarche: {y: 760, page: 2},
  travail: {y: 662, page: 2},
  sante: {y: 564, page: 2},
  imperieux: {y: 511, page: 2},
  handicap: {y: 457, page: 2},
  judiciaire: {y: 415, page: 2},
  demenagement: {y: 346, page: 2},
  transit: {y: 278, page: 2}
}

export async function generatePdf (profile, reasons, pdfBase) {
  const creationInstant = new Date()
  const creationDate = creationInstant.toLocaleDateString('fr-FR')
  const creationHour = creationInstant
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', 'h')

  const {
    lastname,
    firstname,
    birthday,
    placeofbirth,
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
    `Naissance: ${birthday} a ${placeofbirth}`,
    `Adresse: ${address} ${zipcode} ${city}`,
    `Sortie: ${datesortie} a ${heuresortie}`,
    `Motifs: ${reasons}`,
    '', // Pour ajouter un ; aussi au dernier élément
  ].join(';\n')

  const existingPdfBytes = await fetch(pdfBase).then((res) => res.arrayBuffer())

  const pdfDoc = await PDFDocument.load(existingPdfBytes)

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

  const page1 = pdfDoc.getPages()[0]
  const page2 = pdfDoc.getPages()[1]

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const drawText = (text, x, y, size = 11, page_number= 1) => {
    const page = 1 === page_number ? page1 : page2;
    page.drawText(text, { x, y, size, font })
  }

  drawText(`${firstname} ${lastname}`, 112, 516)
  drawText(birthday, 110, 501)
  drawText(placeofbirth, 225, 501)
  drawText(`${address} ${zipcode} ${city}`, 127, 488)

  reasons
    .split(', ')
    .forEach(reason => {
      const val = ys[reason];
      drawText('x', 63, val.y, 12, val.page)
    })

  let locationSize = getIdealFontSize(font, profile.city, 83, 7, 11)

  if (!locationSize) {
    alert(
      'Le nom de la ville risque de ne pas être affiché correctement en raison de sa longueur. ' +
        'Essayez d\'utiliser des abréviations ("Saint" en "St." par exemple) quand cela est possible.',
    )
    locationSize = 7
  }

  drawText(profile.city, 98, 236, locationSize, 2)
  drawText(`${profile.datesortie}`, 78, 222, 11, 2)
  drawText(`${profile.heuresortie}`, 155, 223, 11, 2)

  const qrTitle1 = 'QR-code contenant les informations '
  const qrTitle2 = 'de votre attestation numérique'

  const generatedQR = await generateQR(data)

  const qrImage = await pdfDoc.embedPng(generatedQR)

  pdfDoc.addPage()
  const page3 = pdfDoc.getPages()[2]
  page3.drawText(qrTitle1 + qrTitle2, { x: 50, y: page3.getHeight() - 70, size: 11, font, color: rgb(1, 1, 1) })
  page3.drawImage(qrImage, {
    x: 50,
    y: page3.getHeight() - 390,
    width: 300,
    height: 300,
  })

  const pdfBytes = await pdfDoc.save()

  return new Blob([pdfBytes], { type: 'application/pdf' })
}

function getIdealFontSize (font, text, maxWidth, minSize, defaultSize) {
  let currentSize = defaultSize
  let textWidth = font.widthOfTextAtSize(text, defaultSize)

  while (textWidth > maxWidth && currentSize > minSize) {
    textWidth = font.widthOfTextAtSize(text, --currentSize)
  }

  return textWidth > maxWidth ? null : currentSize
}
