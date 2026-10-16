import type { ShareCardData } from '../types';

const WIDTH = 1080;
const HEIGHT = 1920;

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

async function loadShareCardLogo(): Promise<HTMLImageElement | null> {
  const image = new Image();
  image.src = '/tick-tick-logo.png';
  try {
    await image.decode();
    return image;
  } catch {
    return null;
  }
}

/** Render the server-provided match summary data into a shareable PNG. */
export async function renderShareCardPng(data: ShareCardData): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('Share cards can only be rendered in a browser.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a canvas to render the share card.');

  // Canvas does not wait for CSS web fonts automatically. Load the app's
  // heading/body fonts and logo before drawing so the exported PNG is branded.
  await Promise.all([
    document.fonts.load('400 30px "Patrick Hand"'),
    document.fonts.load('400 30px "Dela Gothic One"'),
  ]);
  const logo = await loadShareCardLogo();

  context.fillStyle = '#f5f0e8';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.strokeStyle = '#c8b89a';
  context.lineWidth = 3;
  roundedRect(context, 28, 28, WIDTH - 56, HEIGHT - 56, 32);
  context.stroke();

  context.fillStyle = '#6b4423';
  roundedRect(context, 32, 32, WIDTH - 64, 300, 28);
  context.fill();

  context.textAlign = 'center';
  context.fillStyle = '#f5f0e8';
  if (logo) {
    const logoHeight = 145;
    const logoWidth = Math.min(410, (logo.width / logo.height) * logoHeight);
    context.drawImage(logo, (WIDTH - logoWidth) / 2, 22, logoWidth, logoHeight);
  } else {
    context.font = '400 38px "Dela Gothic One", sans-serif';
    context.fillText('TICK TICK', WIDTH / 2, 105);
  }
  context.font = '400 56px "Dela Gothic One", sans-serif';
  context.fillText('MATCH RESULTS', WIDTH / 2, 198);
  context.font = '400 30px "Patrick Hand", sans-serif';
  context.fillStyle = '#ead8bd';
  context.fillText(
    `ROOM ${data.roomCode}  ·  ${data.roundsPlayed} ROUNDS  ·  ${formatDuration(data.durationMs)}`,
    WIDTH / 2,
    265,
  );

  context.textAlign = 'left';
  context.fillStyle = '#6b4423';
  context.font = '400 34px "Dela Gothic One", sans-serif';
  context.fillText('FINAL STANDINGS', 88, 405);

  const players = data.players.slice(0, 8);
  const standingsTop = 445;
  const standingsGap = 10;
  const standingsRowHeight = Math.min(
    70,
    Math.floor((610 - (players.length - 1) * standingsGap) / Math.max(players.length, 1)),
  );
  players.forEach((player, index) => {
    const y = standingsTop + index * (standingsRowHeight + standingsGap);
    roundedRect(context, 68, y, WIDTH - 136, standingsRowHeight, 20);
    context.fillStyle = index === 0 ? '#ead8bd' : '#fffdf8';
    context.fill();
    context.strokeStyle = '#d8c8ad';
    context.lineWidth = 2;
    context.stroke();

    context.textAlign = 'left';
    context.fillStyle = '#6b4423';
    context.font = '400 30px "Dela Gothic One", sans-serif';
    context.fillText(`#${player.rank}`, 100, y + standingsRowHeight / 2 + 10);
    context.fillStyle = '#21180f';
    context.font = '400 34px "Patrick Hand", sans-serif';
    context.fillText(player.displayName, 205, y + standingsRowHeight / 2 + 10, 560);

    context.textAlign = 'right';
    context.fillStyle = '#6b4423';
    context.font = '400 34px "Dela Gothic One", sans-serif';
    context.fillText(String(player.totalScore), WIDTH - 104, y + standingsRowHeight / 2 + 10);
  });

  const standingsBottom = players.length
    ? standingsTop + players.length * standingsRowHeight + (players.length - 1) * standingsGap
    : standingsTop;
  const highlights = data.highlights.slice(0, 3);
  let contentBottom = standingsBottom;

  if (highlights.length > 0) {
    const headingY = standingsBottom + 82;
    context.textAlign = 'left';
    context.fillStyle = '#6b4423';
    context.font = '400 34px "Dela Gothic One", sans-serif';
    context.fillText('TOP SCORING WORDS', 88, headingY);

    const highlightsTop = headingY + 32;
    const highlightHeight = 126;
    highlights.forEach((highlight, index) => {
      const y = highlightsTop + index * (highlightHeight + 12);
      roundedRect(context, 68, y, WIDTH - 136, highlightHeight, 20);
      context.fillStyle = '#fffdf8';
      context.fill();
      context.strokeStyle = '#d8c8ad';
      context.lineWidth = 2;
      context.stroke();

      context.textAlign = 'left';
      context.fillStyle = '#6b4423';
      context.font = '400 28px "Dela Gothic One", sans-serif';
      context.fillText(`#${highlight.rank}`, 98, y + 38);
      context.fillStyle = '#21180f';
      context.font = '400 40px "Patrick Hand", sans-serif';
      context.fillText(highlight.word, 190, y + 48, 600);
      context.fillStyle = '#8b5e3c';
      context.font = '400 26px "Patrick Hand", sans-serif';
      context.fillText(
        `${highlight.playerName}  ·  ${highlight.category}  ·  ${highlight.letter}  ·  Round ${highlight.roundNumber}`,
        190,
        y + 88,
        680,
      );
      context.textAlign = 'right';
      context.fillStyle = '#6b4423';
      context.font = '400 34px "Dela Gothic One", sans-serif';
      context.fillText(`+${highlight.score}`, WIDTH - 102, y + 68);
      contentBottom = y + highlightHeight;
    });
  }

  context.textAlign = 'center';
  context.fillStyle = '#8b5e3c';
  context.font = '400 28px "Patrick Hand", sans-serif';
  context.fillText(
    'Play with friends at playticktick.com',
    WIDTH / 2,
    Math.max(1265, contentBottom + 100),
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob || blob.size === 0) throw new Error('The share card image could not be generated.');
  return blob;
}
