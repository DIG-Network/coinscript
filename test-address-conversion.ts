import { addressToPuzzleHash } from '@dignetwork/datalayer-driver';

const bech32Address = 'xch1xf23pd3ludh8chksgaxcs6dkhcwpfm0gv64h02q9rmy6mwwp8w7qtsp7ph';

try {
  const puzzleHash = addressToPuzzleHash(bech32Address);
  console.log('Bech32 address:', bech32Address);
  console.log('Puzzle hash:', puzzleHash);
  console.log('Expected hash:', '0x325510b63fe34e7c5ec0874b183569bc1c049b7436355b7a8051ec9ad9dc139f');
} catch (e: any) {
  console.error('Error:', e.message);
} 