import { generateQR } from './util'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import curfewPdfBase from '../curfew-certificate.pdf'
import quarantinePdfBase from '../quarantine-certificate.pdf'

let positions = {
  travail: { page: 1, y: 579 },
  sante: { page: 1, y: 546 },
  famille: { page: 1, y: 512 },
  handicap: { page: 1, y: 478 },
  judiciaire: { page: 1, y: 458 },
  missions: { page: 1, y: 412 },
  transit: { page: 1, y: 379 },
  animaux: { page: 1, y: 345 },
}
let pdfBase = curfewPdfBase
export async function generatePdf (profile, reasons, context) {
  if (context === 'quarantine') {
    pdfBase = quarantinePdfBase
    positions = {
      sport: { page: 1, y: 367 },
      achats: { page: 1, y: 244 },
      enfants: { page: 1, y: 161 },
      culte_culturel: { page: 2, y: 781 },
      demarche: { page: 2, y: 726 },
      travail: { page: 2, y: 629 },
      sante: { page: 2, y: 533 },
      famille: { page: 2, y: 477 },
      handicap: { page: 2, y: 422 },
      judiciaire: { page: 2, y: 380 },
      demenagement: { page: 2, y: 311 },
      transit: { page: 2, y: 243 },
    }
  } else {
    pdfBase = curfewPdfBase
    positions = {
      travail: { page: 1, y: 579 },
      sante: { page: 1, y: 546 },
      famille: { page: 1, y: 512 },
      handicap: { page: 1, y: 478 },
      judiciaire: { page: 1, y: 458 },
      missions: { page: 1, y: 412 },
      transit: { page: 1, y: 379 },
      animaux: { page: 1, y: 345 },
    }
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
  const drawText = (text, x, y, size = 11) => {
    page1.drawText(text, { x, y, size, font })
  }
  const drawText2 = (text, x, y, size = 11) => {
    page2.drawText(text, { x, y, size, font })
  }

  let locationSize = getIdealFontSize(font, profile.city, 83, 7, 11)

  let reasonX = 73
  if (context === 'quarantine') {
    drawText(`${firstname} ${lastname}`, 111, 516)
    drawText(birthday, 111, 501)
    drawText(placeofbirth, 228, 501)
    drawText(`${address} ${zipcode} ${city}`, 126, 487)

    drawText2(`Fait à ${profile.city}`, 72, 99, locationSize)
    drawText2(`Le ${profile.datesortie}`, 72, 83, 11)
    drawText2(`à ${profile.heuresortie}`, 310, 83, 11)
    drawText2('(Date et heure de début de sortie à mentionner obligatoirement)', 72, 67, 11)
    reasonX = 60
  } else {
    drawText(`${firstname} ${lastname}`, 144, 705)
    drawText(birthday, 144, 684)
    drawText(placeofbirth, 310, 684)
    drawText(`${address} ${zipcode} ${city}`, 148, 665)

    drawText(`Fait à ${profile.city}`, 72, 109, locationSize)
    drawText(`Le ${profile.datesortie}`, 72, 93, 11)
    drawText(`à ${profile.heuresortie}`, 310, 93, 11)
    drawText('(Date et heure de début de sortie à mentionner obligatoirement)', 72, 77, 11)
  }
  reasons
    .split(', ')
    // .filter(el => positions.hasOwnProperty(el))
    .filter(el => Object.prototype.hasOwnProperty.call(positions, el))
    .forEach(reason => {
      positions[reason].page === 2 ? drawText2('x', reasonX, positions[reason].y || 0, 12) : drawText('x', reasonX, positions[reason].y || 0, 12)
    })

  if (!locationSize) {
    alert(
      'Le nom de la ville risque de ne pas être affiché correctement en raison de sa longueur. ' +
        'Essayez d\'utiliser des abréviations ("Saint" en "St." par exemple) quand cela est possible.',
    )
    locationSize = 7
  }

  // const shortCreationDate = `${creationDate.split('/')[0]}/${
  //   creationDate.split('/')[1]
  // }`
  // drawText(shortCreationDate, 314, 189, locationSize)

  // // Date création
  // drawText('Date de création:', 479, 130, 6)
  // drawText(`${creationDate} à ${creationHour}`, 470, 124, 6)

  const qrTitle1 = 'QR-code contenant les informations '
  const qrTitle2 = 'de votre attestation numérique'

  const generatedQR = await generateQR(data)

  const qrImage = await pdfDoc.embedPng(generatedQR)
  let pageX0 = pdfDoc.getPages()[0]
  if (context === 'quarantine') {
    pageX0 = pdfDoc.getPages()[2 - 1]
  }
  pageX0.drawText(qrTitle1 + '\n' + qrTitle2, { x: 470, y: 182, size: 6, font, lineHeight: 10, color: rgb(1, 1, 1) })

  pageX0.drawImage(qrImage, {
    x: pageX0.getWidth() - 107,
    y: 80,
    width: 82,
    height: 82,
  })

  pdfDoc.addPage()
  let pageX = pdfDoc.getPages()[1]
  if (context === 'quarantine') {
    pageX = pdfDoc.getPages()[2]
  }
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

function getIdealFontSize (font, text, maxWidth, minSize, defaultSize) {
  let currentSize = defaultSize
  let textWidth = font.widthOfTextAtSize(text, defaultSize)

  while (textWidth > maxWidth && currentSize > minSize) {
    textWidth = font.widthOfTextAtSize(text, --currentSize)
  }

  return textWidth > maxWidth ? null : currentSize
}
