// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';

error NFTMarketplace__PriceMustBeMoreThan0();
error NFTMarketplace__NotApprovedToListNFT();
error NFTMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);

contract NFTMarketplace {
    ////////////////////////////////////
    // VARIABLES          //////////////
    ////////////////////////////////////
    struct Listing {
        uint256 price;
        address seller;
    }
    // NFT address maps to-> TokenId maps to -> Listing
    mapping(address => mapping(uint256 => Listing)) private s_listings;

    ////////////////////////////////////
    // EVENTS          //////////////
    ////////////////////////////////////
    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    ////////////////////////////////////
    // MODIFERS          //////////////
    ////////////////////////////////////
    modifier notListed(
        address nftAddress,
        uint256 tokenId,
        address owner
    ) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            //if it has a listed price, it's already listed on the marketplace
            revert NFTMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    ////////////////////////////////////
    // FUNCTIONS          //////////////
    ////////////////////////////////////
    function listNFT(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external notListed(nftAddress, tokenId, msg.sender) {
        if (price <= 0) {
            revert NFTMarketplace__PriceMustBeMoreThan0();
        }
        // Option 1: transfer NFT to the contract, which is more expensive. More centralized. More risk.
        // Option 2: owners KEEP their NFT and the owner gives the maretplace approval to sell the NFT for them (less intrusive)
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NFTMarketplace__NotApprovedToListNFT();
        }
        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }
}
