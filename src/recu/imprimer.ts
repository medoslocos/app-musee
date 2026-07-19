/**
 * Impression du reçu. Natif : PDF via expo-print puis partage (expo-sharing).
 * Web : boîte d'impression du navigateur. La mise en page vient de
 * genererHtmlRecu — un seul gabarit pour toutes les plateformes.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function imprimerOuPartagerRecu(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Reçu client',
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ uri });
  }
}
