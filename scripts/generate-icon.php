<?php
declare(strict_types=1);

const SIZE = 1024;
const CX   = SIZE / 2;   // 512
const CY   = SIZE / 2;   // 512
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

// Draw an anti-aliased ring via per-pixel distance check
function drawRing($img, float $cx, float $cy, float $radius, float $thickness, int $color): void
{
    $inner = $radius - $thickness / 2;
    $outer = $radius + $thickness / 2;
    $box   = (int)($outer + 2);
    $x0    = max(0, (int)($cx - $box));
    $x1    = min(SIZE - 1, (int)($cx + $box));
    $y0    = max(0, (int)($cy - $box));
    $y1    = min(SIZE - 1, (int)($cy + $box));

    $r = ($color >> 16) & 0xFF;
    $g = ($color >> 8)  & 0xFF;
    $b = $color & 0xFF;

    for ($y = $y0; $y <= $y1; $y++) {
        for ($x = $x0; $x <= $x1; $x++) {
            $dist = sqrt(($x - $cx) ** 2 + ($y - $cy) ** 2);
            $diff = abs($dist - $radius);          // distance from ring center-line
            $half = $thickness / 2;
            if ($diff > $half + 1.0) continue;

            // 0 = opaque, 127 = transparent in GD
            $alpha = ($diff > $half)
                ? (int)(127 * ($diff - $half))     // sub-pixel AA fade
                : 0;                               // fully opaque

            imagesetpixel($img, $x, $y, imagecolorallocatealpha($img, $r, $g, $b, $alpha));
        }
    }
}

// Draw thick anti-aliased line segment
function drawLine($img, float $x1, float $y1, float $x2, float $y2, float $thickness, int $color): void
{
    $r = ($color >> 16) & 0xFF;
    $g = ($color >> 8)  & 0xFF;
    $b = $color & 0xFF;

    $dx = $x2 - $x1;
    $dy = $y2 - $y1;
    $len = sqrt($dx * $dx + $dy * $dy);
    if ($len < 0.001) return;

    // Perpendicular direction
    $nx = -$dy / $len;
    $ny = $dx  / $len;
    $half = $thickness / 2;

    $minX = (int)min($x1, $x2) - (int)$half - 2;
    $maxX = (int)max($x1, $x2) + (int)$half + 2;
    $minY = (int)min($y1, $y2) - (int)$half - 2;
    $maxY = (int)max($y1, $y2) + (int)$half + 2;

    for ($y = max(0, $minY); $y <= min(SIZE - 1, $maxY); $y++) {
        for ($x = max(0, $minX); $x <= min(SIZE - 1, $maxX); $x++) {
            // Distance from point (x,y) to line segment
            $px = $x - $x1;
            $py = $y - $y1;
            $t  = max(0.0, min(1.0, ($px * $dx + $py * $dy) / ($len * $len)));
            $closestX = $x1 + $t * $dx;
            $closestY = $y1 + $t * $dy;
            $distLine = sqrt(($x - $closestX) ** 2 + ($y - $closestY) ** 2);

            if ($distLine > $half + 1.0) continue;
            $alpha = ($distLine > $half) ? (int)(127 * ($distLine - $half)) : 0;
            imagesetpixel($img, $x, $y, imagecolorallocatealpha($img, $r, $g, $b, $alpha));
        }
    }
}

function makeIcon(bool $withBackground): array
{
    $img = imagecreatetruecolor(SIZE, SIZE);
    imagealphablending($img, false);
    imagesavealpha($img, true);

    // Transparent base
    $transparent = imagecolorallocatealpha($img, 0, 0, 0, 127);
    imagefill($img, 0, 0, $transparent);

    imagealphablending($img, true);

    if ($withBackground) {
        // Smooth diagonal gradient #2581CC → #0D4E8A
        for ($y = 0; $y < SIZE; $y++) {
            for ($x = 0; $x < SIZE; $x++) {
                $t = ($x + $y) / (SIZE * 2);
                $r = (int)(37  + $t * (13  - 37));
                $g = (int)(129 + $t * (78  - 129));
                $b = (int)(204 + $t * (138 - 204));
                imagesetpixel($img, $x, $y, imagecolorallocate($img, $r, $g, $b));
            }
        }
    }

    $white     = 0xFFFFFF;
    $whiteAA   = 0xFFFFFF;

    // Outer compass ring — thick, fully opaque
    drawRing($img, CX, CY, 390.0, 24.0, $white);

    // Inner decorative ring — thin, semi-transparent
    for ($y = 0; $y < SIZE; $y++) {
        for ($x = 0; $x < SIZE; $x++) {
            $dist = sqrt(($x - CX) ** 2 + ($y - CY) ** 2);
            if (abs($dist - 315) < 5) {
                $alpha = (int)(95 + 32 * abs($dist - 315) / 5);  // 95..127
                imagesetpixel($img, $x, $y, imagecolorallocatealpha($img, 255, 255, 255, $alpha));
            }
        }
    }

    // Cardinal tick marks (N / S / E / W)
    $rOuter  = 402.0;   // just outside ring outer edge
    $tickLen = 60.0;
    $tickW   = 22.0;
    foreach ([0, 90, 180, 270] as $deg) {
        $rad = deg2rad($deg);
        $x1 = CX + $rOuter * sin($rad);
        $y1 = CY - $rOuter * cos($rad);
        $x2 = CX + ($rOuter + $tickLen) * sin($rad);
        $y2 = CY - ($rOuter + $tickLen) * cos($rad);
        drawLine($img, $x1, $y1, $x2, $y2, $tickW, $white);
    }

    // Intercardinal tick marks (NE / SE / SW / NW) — smaller
    $tickWsm = 12.0;
    $tickLsm = 42.0;
    foreach ([45, 135, 225, 315] as $deg) {
        $rad = deg2rad($deg);
        $x1 = CX + $rOuter * sin($rad);
        $y1 = CY - $rOuter * cos($rad);
        $x2 = CX + ($rOuter + $tickLsm) * sin($rad);
        $y2 = CY - ($rOuter + $tickLsm) * cos($rad);
        drawLine($img, $x1, $y1, $x2, $y2, $tickWsm, 0xCCEEFF);
    }

    // --- Euro symbol ---
    $fontSz = 340.0;
    $euro   = "\xe2\x82\xac";
    $bbox   = imagettfbbox($fontSz, 0, FONT, $euro);
    $textW  = $bbox[2] - $bbox[0];
    $textH  = abs($bbox[7] - $bbox[1]);
    $textX  = (int)(CX - $textW / 2);
    $textY  = (int)(CY + $textH / 2 - abs($bbox[1]));
    imagettftext($img, $fontSz, 0, $textX, $textY, imagecolorallocate($img, 255, 255, 255), FONT, $euro);

    return [$img];
}

function saveIcon($img, string $path, int $size = SIZE): void
{
    if ($size < SIZE) {
        $out = imagecreatetruecolor($size, $size);
        imagealphablending($out, false);
        imagesavealpha($out, true);
        $t = imagecolorallocatealpha($out, 0, 0, 0, 127);
        imagefill($out, 0, 0, $t);
        imagecopyresampled($out, $img, 0, 0, 0, 0, $size, $size, SIZE, SIZE);
        imagepng($out, $path, 9);
        imagedestroy($out);
    } else {
        imagepng($img, $path, 9);
    }
    echo "  Written: $path ($size×$size)\n";
}

$outDir = __DIR__ . '/../assets';
echo "Generating icons...\n";

[$full] = makeIcon(true);
saveIcon($full, "$outDir/icon.png", 1024);
saveIcon($full, "$outDir/splash-icon.png", 200);
saveIcon($full, "$outDir/favicon.png", 48);
imagedestroy($full);

[$fg] = makeIcon(false);
saveIcon($fg, "$outDir/android-icon-foreground.png", 1024);
saveIcon($fg, "$outDir/android-icon-monochrome.png", 1024);
imagedestroy($fg);

// Solid gradient background
$bg = imagecreatetruecolor(SIZE, SIZE);
for ($y = 0; $y < SIZE; $y++) {
    for ($x = 0; $x < SIZE; $x++) {
        $t = ($x + $y) / (SIZE * 2);
        $r = (int)(37  + $t * (13  - 37));
        $g = (int)(129 + $t * (78  - 129));
        $b = (int)(204 + $t * (138 - 204));
        imagesetpixel($bg, $x, $y, imagecolorallocate($bg, $r, $g, $b));
    }
}
imagepng($bg, "$outDir/android-icon-background.png", 9);
imagedestroy($bg);
echo "  Written: $outDir/android-icon-background.png\n";

echo "Done.\n";
