$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$package = Get-Content -Raw -LiteralPath (Join-Path $root 'package.json') | ConvertFrom-Json
if ($package.name -ne 'fifi-tools' -or -not (Test-Path -LiteralPath (Join-Path $root '.git'))) {
  throw "Refusing to vendor outside the fifi-tools worktree: $root"
}

$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$stage = [IO.Path]::GetFullPath((Join-Path $tempRoot ('fifi-game-vendor-' + [guid]::NewGuid())))
$sources = @(
  @{ Id='2048'; Repo='https://github.com/gabrielecirulli/2048.git'; Commit='478b6ec346e3787f589e4af751378d06ded4cbbc'; License='LICENSE.txt'; Paths=@('index.html','js','style/main.css') },
  @{ Id='sudoku'; Repo='https://github.com/robatron/sudoku.js.git'; Commit='4362a13510925f03a2f749b4657a8e4c5f36a869'; License='LICENSE'; Paths=@('sudoku.js') },
  @{ Id='tetris'; Repo='https://github.com/jakesgordon/javascript-tetris.git'; Commit='e5c0c42f7dac0f3514a55eff656c6e22e95d68ed'; License='LICENSE'; Paths=@('index.html') },
  @{ Id='snake'; Repo='https://github.com/patorjk/JavaScript-Snake.git'; Commit='68d0ef1a53d6a4191a9c4e4b851d5d4fdc86ce05'; License='LICENSE'; Paths=@('src/js/snake.js') },
  @{ Id='matter-js'; Repo='https://github.com/liabru/matter-js.git'; Commit='acb99b6f8784c809b940f1d2cf745427e088e088'; License='LICENSE'; Paths=@('build/matter.min.js') }
)

New-Item -ItemType Directory -Path $stage | Out-Null
try {
  foreach ($source in $sources) {
    $checkout = Join-Path $stage $source.Id
    git clone --quiet --filter=blob:none --no-checkout $source.Repo $checkout
    if ($LASTEXITCODE -ne 0) { throw "Clone failed: $($source.Id)" }
    git -C $checkout checkout --quiet $source.Commit
    if ($LASTEXITCODE -ne 0) { throw "Checkout failed: $($source.Id)" }

    $licenseTarget = Join-Path $root "public\games\licenses\$($source.Id)-LICENSE.txt"
    New-Item -ItemType Directory -Path (Split-Path $licenseTarget) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $checkout $source.License) -Destination $licenseTarget -Force

    $vendorRoot = Join-Path $root "vendor\game-sources\$($source.Id)"
    foreach ($relativePath in $source.Paths) {
      $from = Join-Path $checkout $relativePath
      $to = Join-Path $vendorRoot $relativePath
      New-Item -ItemType Directory -Path (Split-Path $to) -Force | Out-Null
      Copy-Item -LiteralPath $from -Destination $to -Recurse -Force
    }
  }
}
finally {
  $resolvedStage = [IO.Path]::GetFullPath($stage)
  $expectedPrefix = [IO.Path]::GetFullPath((Join-Path $tempRoot 'fifi-game-vendor-'))
  if ((Test-Path -LiteralPath $resolvedStage) -and $resolvedStage.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $resolvedStage -Recurse -Force
  }
}
