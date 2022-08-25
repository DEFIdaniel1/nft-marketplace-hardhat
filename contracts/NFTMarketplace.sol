// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

error NFTMarketplace__PriceMustBeMoreThan0();
error NFTMarketplace__NotApprovedToListNFT();
error NFTMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NFTMarketplace__NotNFTOwner();
error NFTMarketplace__NotListedForSale(address nftAddress, uint256 tokenId);
error NFTMarketplace__PriceNotMet(address nftAddress, uint256 tokenId, uint256 nftPrice);
error NFTMarketplace__NoProceedsToWithdraw();
error NFTMarketplace__TransferFailed();

contract NFTMarketplace is ReentrancyGuard {
    ////////////////////////////////////
    // VARIABLES          //////////////
    ////////////////////////////////////
    struct Listing {
        uint256 price;
        address seller;
    }
    // nftAddress -> TokenId -> Listing
    mapping(address => mapping(uint256 => Listing)) private s_listings;
    // sellerAddress -> amount earned
    mapping(address => uint256) private s_proceeds;

    ////////////////////////////////////
    // EVENTS          //////////////
    ////////////////////////////////////
    event NFTListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event NFTPurchased(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event ListingCancelled(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
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
    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price == 0) {
            //if it has a listed price, it's already listed on the marketplace
            revert NFTMarketplace__NotListedForSale(nftAddress, tokenId);
        }
        _;
    }
    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (spender != owner) {
            revert NFTMarketplace__NotNFTOwner();
        }
        _;
    }

    ////////////////////////////////////
    // FUNCTIONS          //////////////
    ////////////////////////////////////
    /**
     * @notice Method for listing NFT
     * @param nftAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     * @param price sale price for each item
     */
    function listNFT(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external notListed(nftAddress, tokenId, msg.sender) isOwner(nftAddress, tokenId, msg.sender) {
        if (price == 0) {
            revert NFTMarketplace__PriceMustBeMoreThan0();
        }
        // Option 1: transfer NFT to the contract, which is more expensive. More centralized. More risk.
        // Option 2: owners KEEP their NFT and the owner gives the maretplace approval to sell the NFT for them (less intrusive)
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NFTMarketplace__NotApprovedToListNFT();
        }
        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit NFTListed(msg.sender, nftAddress, tokenId, price);
    }

    function buyNFT(address nftAddress, uint256 tokenId)
        public
        payable
        nonReentrant
        isListed(nftAddress, tokenId)
    {
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if (msg.value < listedItem.price) {
            revert NFTMarketplace__PriceNotMet(nftAddress, tokenId, listedItem.price);
        }
        s_proceeds[listedItem.seller] += msg.value;
        delete (s_listings[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(listedItem.seller, msg.sender, tokenId);
        emit NFTPurchased(msg.sender, nftAddress, tokenId, listedItem.price);
    }

    function cancelListing(address nftAddress, uint256 tokenId)
        external
        isOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        delete (s_listings[nftAddress][tokenId]);
        emit ListingCancelled(msg.sender, nftAddress, tokenId);
    }

    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    ) external isOwner(nftAddress, tokenId, msg.sender) isListed(nftAddress, tokenId) {
        s_listings[nftAddress][tokenId].price = newPrice;
        emit NFTListed(msg.sender, nftAddress, tokenId, newPrice);
    }

    function withdrawProceeds() external payable {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) {
            revert NFTMarketplace__NoProceedsToWithdraw();
        }
        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}('');
        if (!success) {
            revert NFTMarketplace__TransferFailed();
        }
    }

    ////////////////////////////////////
    // GET FUNCTIONS       //////////////
    ////////////////////////////////////
    function getListing(address nftAddress, uint256 tokenId)
        external
        view
        returns (Listing memory)
    {
        return s_listings[nftAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }
}
