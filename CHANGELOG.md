# Changelog

## [Unreleased]
### Fixed
- **CoinScript Compilation**: Fixed three critical issues in the CoinScript compiler:
  - Storage values are now properly substituted in expressions (e.g., `enabled` becomes `1` or `0`)
  - `send()` statements now correctly generate `CREATE_COIN` conditions
  - `require(msg.sender == address)` patterns now generate proper `AGG_SIG_ME` conditions for signature verification
  
### Documentation
- Updated all documentation to accurately explain the distinction between `storage` (immutable, curried) and `state` (mutable, requires slot-machine pattern)
- Replaced complex examples with simpler, accurate ones that don't show unsupported features
- Added clear explanations about CoinScript's compilation model

## [Previous versions...] 