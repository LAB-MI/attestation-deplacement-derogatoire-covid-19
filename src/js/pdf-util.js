import { generateQR } from './util'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const positions = {
  curfew: {
    context_x: 60,
    name: {x: 104, y: 650, page: 1},
    birthday: {x: 104, y: 637, page: 1},
    placeofbirth: {x: 180, y: 637, page: 1},
    address: {x: 120, y: 623, page: 1},
    city: {x: 90, y: 212, page: 1},
    datesortie: {x: 74, y: 201, page: 1},
    heuresortie: {x: 149, y: 201, page: 1},
    context: {
      travail: {y: 548, page: 1},
      sante: {y: 502, page: 1},
      imperial: {y: 455, page: 1},
      handicap: {y: 410, page: 1},
      judiciaire: {y: 374, page: 1},
      missions: {y: 328, page: 1},
      transit: {y: 295, page: 1},
      animaux: {y: 248, page: 1}
    }
  },
  quarantine: {
    context_x: 63,
    name: {x: 112, y: 516, page: 1},
    birthday: {x: 110, y: 501, page: 1},
    placeofbirth: {x: 225, y: 501, page: 1},
    address: {x: 127, y : 488, page: 1},
    city: {x: 98, y: 236, page: 2},
    datesortie: {x: 78, y: 222, page: 2},
    heuresortie: {x: 155, y: 223, page: 2},
    context: {
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
  }
}

export async function generatePdf (profile, reasons, pdfBase, pdfType) {
  const pdfPositions = positions[pdfType]
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

  drawText(`${firstname} ${lastname}`, pdfPositions.name.x, pdfPositions.name.y)
  drawText(birthday, pdfPositions.birthday.x, pdfPositions.birthday.y)
  drawText(placeofbirth, pdfPositions.placeofbirth.x, pdfPositions.placeofbirth.y)
  drawText(`${address} ${zipcode} ${city}`, pdfPositions.address.x, pdfPositions.address.y)

  reasons
    .split(', ')
    .forEach(reason => {
      const val = pdfPositions.context[reason];
      drawText('x', pdfPositions.context_x, val.y, 12, val.page)
    })

  let locationSize = getIdealFontSize(font, profile.city, 83, 7, 11)

  if (!locationSize) {
    alert(
      'Le nom de la ville risque de ne pas être affiché correctement en raison de sa longueur. ' +
        'Essayez d\'utiliser des abréviations ("Saint" en "St." par exemple) quand cela est possible.',
    )
    locationSize = 7
  }

  drawText(profile.city, pdfPositions.city.x, pdfPositions.city.y, locationSize, pdfPositions.city.page)
  drawText(`${profile.datesortie}`, pdfPositions.datesortie.x, pdfPositions.datesortie.y, 11, pdfPositions.datesortie.page)
  drawText(`${profile.heuresortie}`, pdfPositions.heuresortie.x, pdfPositions.heuresortie.y, 11, pdfPositions.heuresortie.page)

  await generateQRPage(data, font, pdfDoc, pdfType)

  const pdfBytes = await pdfDoc.save()

  return new Blob([pdfBytes], { type: 'application/pdf' })
}

async function generateQRPage(data, font, pdfDoc, pdfType) {
  const qrTitle1 = 'QR-code contenant les informations '
  const qrTitle2 = 'de votre attestation numérique'

  const generatedQR = await generateQR(data)

  const qrImage = await pdfDoc.embedPng(generatedQR)

  pdfDoc.addPage()
  const index = 'curfew' === pdfType ? 1 : 2; 
  const page = pdfDoc.getPages()[index]
  page.drawText(qrTitle1 + qrTitle2, { x: 50, y: page.getHeight() - 70, size: 11, font, color: rgb(1, 1, 1) })
  page.drawImage(qrImage, {
    x: 50,
    y: page.getHeight() - 390,
    width: 300,
    height: 300,
  })
}

function getIdealFontSize (font, text, maxWidth, minSize, defaultSize) {
  let currentSize = defaultSize
  let textWidth = font.widthOfTextAtSize(text, defaultSize)

  while (textWidth > maxWidth && currentSize > minSize) {
    textWidth = font.widthOfTextAtSize(text, --currentSize)
  }

  return textWidth > maxWidth ? null : currentSize
}
