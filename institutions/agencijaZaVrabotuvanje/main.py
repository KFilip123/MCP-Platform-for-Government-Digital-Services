from mcp.server.fastmcp import FastMCP

from institutions.agencijaZaVrabotuvanje.auth.session_tools import (
    login as _login,
    logout as _logout,
    check_session as _check_session,
)

from institutions.agencijaZaVrabotuvanje.tools.public_tools import (
    viewJobs as _viewJobs,
    searchJobs as _searchJobs,
    getJobDetails as _getJobDetails,
)

from institutions.agencijaZaVrabotuvanje.tools.authenticated_tools import (
    getUserDashboard as _getUserDashboard,
    viewCV as _viewCV,
    downloadCV as _downloadCV,
    createCV as _createCV,
    editCV as _editCV,
    saveJobFavourite as _saveJobFavourite,
    viewFavouriteJobs as _viewFavouriteJobs,
    removeFavouriteJob as _removeFavouriteJob,
    sendJobInvitation as _sendJobInvitation,
)

mcp = FastMCP("agencija-za-vrabotuvanje")


@mcp.tool()
def login() -> dict:
    """
    Starts browser-based authentication via eID SSO.
    Opens a browser window and saves session cookies after login.
    """
    return _login()


@mcp.tool()
def logout() -> dict:
    """
    Clears stored session cookies (logs the user out locally).
    """
    return _logout()


@mcp.tool()
def check_session() -> dict:
    """
    Checks whether a valid session exists in local storage.
    """
    return _check_session()


# ─────────────────────────────────────────────
# PUBLIC JOB SEARCH TOOLS
# ─────────────────────────────────────────────

@mcp.tool()
def viewJobs(page: int = 1) -> dict:
    """
    Returns all active job listings (no filters).
    """
    return _viewJobs(page=page)


@mcp.tool()
def searchJobs(
    zanimanje: str = "",
    centar: str = "",
    opstina: str = "",
    page: int = 1,
) -> dict:
    """
    Performs basic job search using filters:
    - occupation (zanimanje)
    - employment center (centar)
    - municipality (opstina)
    """
    return _searchJobs(
        zanimanje=zanimanje,
        centar=centar,
        opstina=opstina,
        page=page,
    )


@mcp.tool()
def getJobDetails(oglas_id: str) -> dict:
    """
    Returns full details for a specific job listing.
    Requires oglas_id (internal job identifier).
    """
    return _getJobDetails(oglas_id=oglas_id)


# ─────────────────────────────────────────────
# AUTHENTICATED USER TOOLS
# ─────────────────────────────────────────────

@mcp.tool()
def getUserDashboard() -> dict:
    """
    Returns user dashboard data:
    - CV views
    - favourite companies
    - recommended jobs

    Requires authentication.
    """
    return _getUserDashboard()


@mcp.tool()
def viewCV() -> dict:
    """
    Returns all CVs for the logged-in user.

    Requires authentication.
    """
    return _viewCV()


@mcp.tool()
def downloadCV(cv_id: str = "") -> dict:
    """
    Downloads a CV.

    If cv_id is not provided:
    - Automatically selects the CV if only one exists
    - Otherwise requests user selection

    Requires authentication.
    """
    return _downloadCV(cv_id=cv_id or None)


@mcp.tool()
def createCV(data: dict) -> dict:
    """
    Creates a new CV using provided data.

    Requires authentication.
    """
    return _createCV(data=data)


@mcp.tool()
def editCV(cv_id: str = "", data: dict | None = None) -> dict:
    """
    Edits an existing CV.

    If cv_id is not provided:
    - Automatically selects the CV if only one exists
    - Otherwise requests user selection

    If no data is provided:
    - Returns editable CV structure

    Requires authentication.
    """
    return _editCV(cv_id=cv_id or None, data=data)


# ─────────────────────────────────────────────
# JOB FAVOURITES & INVITATIONS
# ─────────────────────────────────────────────

@mcp.tool()
def saveJobFavourite(oglas_id: str, favourite_name: str = "") -> dict:
    """
    Adds a job listing to user's favourites.

    Optional:
    - favourite_name: custom label for the saved job

    Requires authentication.
    """
    return _saveJobFavourite(
        oglas_id=oglas_id,
        favourite_name=favourite_name or None,
    )


@mcp.tool()
def viewFavouriteJobs() -> dict:
    """
    Returns all favourite job listings for the user.

    Requires authentication.
    """
    return _viewFavouriteJobs()


@mcp.tool()
def removeFavouriteJob(oglas_id: str) -> dict:
    """
    Removes a job listing from favourites.

    Requires authentication.
    """
    return _removeFavouriteJob(oglas_id=oglas_id)


@mcp.tool()
def sendJobInvitation(
    oglas_id: str,
    message: str = "",
    show_personal_data: bool = True,
) -> dict:
    """
    Sends a job application/invitation message to the employer.

    Parameters:
    - oglas_id: job identifier
    - message: optional message (max ~400 chars)
    - show_personal_data: whether to share personal info

    Requires authentication.
    """
    return _sendJobInvitation(
        oglas_id=oglas_id,
        message=message,
        show_personal_data=show_personal_data,
    )

if __name__ == "__main__":
    mcp.run()